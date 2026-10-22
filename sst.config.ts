// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- required by SST for the global $config/sst types
/// <reference path="./.sst/platform/config.d.ts" />

// Pick N Roll on AWS (personal account, us-east-1).
// Stages:
//   staging    -> https://staging.picknroll.net
//   production -> https://picknroll.net (www redirects to apex)
// Requires a Route 53 hosted zone for picknroll.net in the same AWS account.

export default $config({
  app(input) {
    return {
      name: "picknroll",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
      home: "aws",
      providers: {
        aws: {
          region: "us-east-1",
          // Always use the personal Pick N Roll account locally (the default profile is a different account).
          // GitHub Actions authenticates with its OIDC role instead.
          profile: process.env.GITHUB_ACTIONS ? undefined : "picknroll",
        },
      },
    };
  },
  async run() {
    const isProduction = $app.stage === "production";
    const rootDomain = "picknroll.net";
    const siteDomain = isProduction ? rootDomain : `${$app.stage}.${rootDomain}`;

    // Secrets: set with `npx sst secret set <Name> <value> --stage <stage>`
    const nextAuthSecret = new sst.Secret("NextAuthSecret");
    const googleApiKey = new sst.Secret("GoogleApiKey", "");

    // NAT via a t4g.nano EC2 instance (fck-nat) instead of a ~$32+/mo NAT Gateway.
    // Needed so Lambdas inside the VPC can reach ESPN, SES, and Gemini.
    // The NAT instance doubles as the bastion for `sst tunnel` (no extra cost).
    const vpc = new sst.aws.Vpc("Vpc", { nat: "ec2", bastion: true });

    // Aurora Serverless v2 PostgreSQL. Pauses after 10 idle minutes (~15s to resume).
    const database = new sst.aws.Aurora("Database", {
      engine: "postgres",
      vpc,
      scaling: { min: "0 ACU", max: "2 ACU", pauseAfter: "10 minutes" },
    });

    // connect_timeout/pool_timeout cover the auto-pause resume; one connection per Lambda instance.
    const databaseUrl = $interpolate`postgresql://${database.username}:${database.password.apply(encodeURIComponent)}@${database.host}:${database.port}/${database.database}?sslmode=require&connect_timeout=30&pool_timeout=30&connection_limit=1`;
    const databaseEnv = { DATABASE_URL: databaseUrl, DATABASE_URL_UNPOOLED: databaseUrl };

    // SES domain identity (DKIM, custom MAIL FROM/SPF, DMARC records created in Route 53)
    const email = new sst.aws.Email("Email", {
      sender: siteDomain,
      dmarc: isProduction
        ? "v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;"
        : "v=DMARC1; p=none;",
      mailFrom: { domain: `mail.${siteDomain}` },
      // Production takes over the _dmarc record copied from GoDaddy
      dns: sst.aws.dns({ override: isProduction }),
    });

    // SKIP_DOMAIN=true deploys without attaching the custom domain (used to load data before a DNS cutover)
    const attachDomain = process.env.SKIP_DOMAIN !== "true";

    const web = new sst.aws.Nextjs("Web", {
      openNextVersion: "4.1.10",
      // Next.js copies a local .env into the server bundle; all runtime config comes from `environment` below
      buildCommand: "npx --yes @opennextjs/aws@4.1.10 build && rm -f .open-next/server-functions/default/.env*",
      vpc,
      link: [database, email],
      domain: attachDomain
        ? {
            name: siteDomain,
            redirects: isProduction ? [`www.${rootDomain}`] : undefined,
            // Production replaces the old Vercel A record during cutover
            dns: sst.aws.dns({ override: isProduction }),
          }
        : undefined,
      environment: {
        ...databaseEnv,
        NEXTAUTH_URL: `https://${siteDomain}`,
        NEXTAUTH_SECRET: nextAuthSecret.value,
        GOOGLE_API_KEY: googleApiKey.value,
        FROM_EMAIL: `Pick N Roll <noreply@${siteDomain}>`,
        // Public payment details shown on /payment (same values as the former Vercel production env).
        // Set explicitly so a local .env can't override them at build time.
        NEXT_PUBLIC_PAYPAL_LINK: "https://paypal.me/Traviscatt",
        NEXT_PUBLIC_VENMO_USERNAME: "Traviscatt",
        NEXT_PUBLIC_ENTRY_FEE: "5.00",
      },
    });

    // ESPN results sync: every 2 minutes, March and April only (UTC). Outside that window nothing runs,
    // so Aurora can stay paused. The handler also skips the database when ESPN has no completed games.
    new sst.aws.CronV2("EspnSync", {
      schedule: "cron(0/2 * * 3-4 ? *)",
      function: {
        handler: "src/jobs/espn-sync.handler",
        timeout: "5 minutes",
        vpc,
        link: [database],
        environment: databaseEnv,
        copyFiles: [{ from: "node_modules/.prisma/client/" }],
      },
    });

    // Gives `sst shell --target Prisma` the DATABASE_URL (prisma db push, pg_restore, studio). Needs `sst tunnel`.
    new sst.x.DevCommand("Prisma", {
      environment: databaseEnv,
      dev: { autostart: false, command: "npx prisma studio" },
    });

    return {
      url: web.url,
      domain: `https://${siteDomain}`,
    };
  },
});
