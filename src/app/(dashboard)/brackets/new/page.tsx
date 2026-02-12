"use client";

import { useState, useEffect, Suspense } from "react";
import confetti from "canvas-confetti";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Info,
  Users,
  DollarSign,
  CheckCircle,
  Copy,
  ExternalLink,
  Upload,
  LayoutGrid,
  GitBranch,
  Download,
  Lock,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { GameCard, DesktopBracketView } from "@/components/bracket";
import { generateBracketPDF } from "@/lib/generateBracketPDF";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { SCORING_RULES, getChoicesForRound } from "@/lib/scoring";

// Sample teams for demonstration
const REGIONS = ["South", "West", "East", "Midwest"] as const;
type Region = (typeof REGIONS)[number];

interface Team {
  id: string;
  name: string;
  seed: number;
  region: Region;
  logo: string;
  record?: string;
}

// 2025 NCAA Tournament Team Data with ESPN logo URLs
// Regions: South, West, East, Midwest
const TEAM_DATA: { name: string; logo: string; record: string }[] = [
  // SOUTH REGION (seeds 1-16) — Atlanta
  { name: "Auburn", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2.png", record: "30-5" },
  { name: "Michigan State", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/127.png", record: "26-9" },
  { name: "Iowa State", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/66.png", record: "27-7" },
  { name: "Texas A&M", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/245.png", record: "24-10" },
  { name: "Michigan", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/130.png", record: "23-11" },
  { name: "Ole Miss", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/145.png", record: "22-11" },
  { name: "Marquette", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/269.png", record: "24-9" },
  { name: "Louisville", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/97.png", record: "21-12" },
  { name: "Creighton", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/156.png", record: "20-13" },
  { name: "New Mexico", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/167.png", record: "23-10" },
  { name: "San Diego State", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/21.png", record: "22-11" },
  { name: "UC San Diego", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/28.png", record: "22-10" },
  { name: "Yale", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/43.png", record: "23-8" },
  { name: "Lipscomb", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/288.png", record: "26-8" },
  { name: "Bryant", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2803.png", record: "22-12" },
  { name: "Alabama State", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2011.png", record: "18-15" },
  // WEST REGION (seeds 1-16) — San Francisco
  { name: "Florida", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/57.png", record: "28-7" },
  { name: "St. John's", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2599.png", record: "26-8" },
  { name: "Texas Tech", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2641.png", record: "25-9" },
  { name: "Maryland", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/120.png", record: "24-10" },
  { name: "Memphis", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/235.png", record: "23-11" },
  { name: "Missouri", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/142.png", record: "22-12" },
  { name: "Kansas", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2305.png", record: "25-9" },
  { name: "UConn", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/41.png", record: "20-13" },
  { name: "Oklahoma", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/201.png", record: "21-12" },
  { name: "Arkansas", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/8.png", record: "21-13" },
  { name: "Drake", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2181.png", record: "27-6" },
  { name: "Colorado State", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/36.png", record: "24-10" },
  { name: "Grand Canyon", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2253.png", record: "26-7" },
  { name: "UNC Wilmington", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/350.png", record: "24-9" },
  { name: "Omaha", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2437.png", record: "22-12" },
  { name: "Norfolk State", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2450.png", record: "20-14" },
  // EAST REGION (seeds 1-16) — Newark
  { name: "Duke", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/150.png", record: "29-6" },
  { name: "Alabama", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/333.png", record: "27-7" },
  { name: "Wisconsin", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/275.png", record: "26-8" },
  { name: "Arizona", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/12.png", record: "24-10" },
  { name: "Oregon", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2483.png", record: "24-10" },
  { name: "BYU", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/252.png", record: "23-11" },
  { name: "Saint Mary's", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2608.png", record: "26-7" },
  { name: "Mississippi State", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/344.png", record: "21-12" },
  { name: "Baylor", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/239.png", record: "19-14" },
  { name: "Vanderbilt", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/238.png", record: "21-13" },
  { name: "VCU", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2670.png", record: "23-10" },
  { name: "Liberty", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2335.png", record: "25-9" },
  { name: "Akron", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2006.png", record: "24-10" },
  { name: "Montana", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/149.png", record: "22-11" },
  { name: "Robert Morris", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2523.png", record: "21-13" },
  { name: "American", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/44.png", record: "19-14" },
  // MIDWEST REGION (seeds 1-16) — Indianapolis
  { name: "Houston", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/248.png", record: "31-4" },
  { name: "Tennessee", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2633.png", record: "25-9" },
  { name: "Kentucky", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/96.png", record: "24-10" },
  { name: "Purdue", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2509.png", record: "28-6" },
  { name: "Clemson", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/228.png", record: "23-11" },
  { name: "Illinois", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/356.png", record: "22-12" },
  { name: "UCLA", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/26.png", record: "23-11" },
  { name: "Gonzaga", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2250.png", record: "27-7" },
  { name: "Georgia", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/61.png", record: "20-13" },
  { name: "Utah State", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/328.png", record: "26-8" },
  { name: "Texas", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/251.png", record: "20-14" },
  { name: "McNeese", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2377.png", record: "28-5" },
  { name: "High Point", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2272.png", record: "27-6" },
  { name: "Troy", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2653.png", record: "24-10" },
  { name: "Wofford", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2747.png", record: "23-11" },
  { name: "SIU Edwardsville", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2565.png", record: "21-13" },
];

// Generate sample teams for the bracket
const generateSampleTeams = (): Team[] => {
  const teams: Team[] = [];
  let dataIndex = 0;

  for (const region of REGIONS) {
    for (let seed = 1; seed <= 16; seed++) {
      const teamData = TEAM_DATA[dataIndex] || { name: `Team ${dataIndex + 1}`, logo: "", record: "0-0" };
      teams.push({
        id: `${region.toLowerCase()}-${seed}`,
        name: teamData.name,
        seed,
        region,
        logo: teamData.logo,
        record: teamData.record,
      });
      dataIndex++;
    }
  }

  return teams;
};

const SAMPLE_TEAMS = generateSampleTeams();

interface GamePick {
  gameId: string;
  round: number;
  choices: string[]; // Team IDs in order of preference
}

interface FamilyMember {
  id: string;
  name: string;
}

function NewBracketContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const [bracketName, setBracketName] = useState("My Bracket");
  const [currentRound, setCurrentRound] = useState(1);
  const [currentRegion, setCurrentRegion] = useState<Region>("South");
  const [picks, setPicks] = useState<Map<string, GamePick>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<string>("self"); // "self" or family member ID
  const [tiebreaker, setTiebreaker] = useState<number | "">("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submittedBracketId, setSubmittedBracketId] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userPoolId, setUserPoolId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "bracket">("card");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [familyRes, poolsRes] = await Promise.all([
          fetch("/api/family-members"),
          fetch("/api/pools"),
        ]);
        if (familyRes.ok) {
          const data = await familyRes.json();
          setFamilyMembers(data);
        }
        if (poolsRes.ok) {
          const pools = await poolsRes.json();
          if (pools.length > 0) {
            setUserPoolId(pools[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      }
    };

    if (session) {
      fetchInitialData();
    }
  }, [session]);

  // Load extracted bracket data from AI upload
  useEffect(() => {
    const fromUpload = searchParams.get("fromUpload");
    if (fromUpload !== "true" || !session) return;

    try {
      const stored = sessionStorage.getItem("extractedBracket");
      if (!stored) return;

      const extracted = JSON.parse(stored);
      sessionStorage.removeItem("extractedBracket");

      // Build a name->teamId lookup from SAMPLE_TEAMS
      const teamLookup = new Map<string, string>();
      for (const t of SAMPLE_TEAMS) {
        teamLookup.set(t.name.toLowerCase(), t.id);
      }

      const findTeamId = (name: string | null): string | null => {
        if (!name) return null;
        const lower = name.toLowerCase().trim();
        // Direct match
        if (teamLookup.has(lower)) return teamLookup.get(lower)!;
        // Partial match
        for (const [key, id] of teamLookup.entries()) {
          if (key.includes(lower) || lower.includes(key)) return id;
        }
        return null;
      };

      const newPicks = new Map<string, GamePick>();

      // Process each region's round picks
      if (extracted.regions) {
        for (const region of REGIONS) {
          const regionData = extracted.regions[region];
          if (!regionData) continue;

          // Round 1: 8 winners
          const r1Picks = regionData.round1 || [];
          for (let g = 0; g < r1Picks.length && g < 8; g++) {
            const teamId = findTeamId(r1Picks[g]);
            if (teamId) {
              const gameId = `${region}-r1-g${g + 1}`;
              newPicks.set(gameId, { gameId, round: 1, choices: [teamId] });
            }
          }

          // Round 2: 4 winners
          const r2Picks = regionData.round2 || [];
          for (let g = 0; g < r2Picks.length && g < 4; g++) {
            const teamId = findTeamId(r2Picks[g]);
            if (teamId) {
              const gameId = `${region}-r2-g${g + 1}`;
              newPicks.set(gameId, { gameId, round: 2, choices: [teamId] });
            }
          }

          // Sweet 16: 2 winners
          const s16Picks = regionData.sweet16 || [];
          for (let g = 0; g < s16Picks.length && g < 2; g++) {
            const teamId = findTeamId(s16Picks[g]);
            if (teamId) {
              const gameId = `${region}-r3-g${g + 1}`;
              newPicks.set(gameId, { gameId, round: 3, choices: [teamId] });
            }
          }

          // Elite 8: 1 winner
          const e8Picks = regionData.elite8 || [];
          if (e8Picks[0]) {
            const teamId = findTeamId(e8Picks[0]);
            if (teamId) {
              const gameId = `${region}-r4-g1`;
              newPicks.set(gameId, { gameId, round: 4, choices: [teamId] });
            }
          }
        }
      }

      // Tiebreaker
      if (extracted.tiebreaker !== null && extracted.tiebreaker !== undefined) {
        setTiebreaker(extracted.tiebreaker);
      }

      if (newPicks.size > 0) {
        setPicks(newPicks);
        toast.success(`Loaded ${newPicks.size} picks from uploaded bracket`);
      }
    } catch (error) {
      console.error("Failed to load uploaded bracket data:", error);
    }
  }, [session, searchParams]);

  // Load existing bracket data when editing
  useEffect(() => {
    const loadBracket = async () => {
      if (!editId || !session) return;
      try {
        const response = await fetch(`/api/brackets/${editId}`);
        if (response.ok) {
          const bracket = await response.json();
          setBracketName(bracket.name);
          setIsEditing(true);
          setSubmittedBracketId(bracket.id);
          if (bracket.tiebreaker !== null && bracket.tiebreaker !== undefined) {
            setTiebreaker(bracket.tiebreaker);
          }
          if (bracket.familyMemberId) {
            setSelectedPerson(bracket.familyMemberId);
          }
          // Restore picks from picksData JSON
          if (bracket.picksData) {
            try {
              const picksArray = JSON.parse(bracket.picksData);
              const picksMap = new Map<string, GamePick>();
              for (const pick of picksArray) {
                if (pick.gameId) {
                  picksMap.set(pick.gameId, pick);
                }
              }
              setPicks(picksMap);
            } catch {
              console.error("Failed to parse picks data");
            }
          }
        }
      } catch (error) {
        console.error("Failed to load bracket:", error);
      }
    };
    loadBracket();
  }, [editId, session]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!session) return null;

  const getTeamsForRegion = (region: Region) => {
    return SAMPLE_TEAMS.filter((t) => t.region === region);
  };

  // Check if previous round is complete for a region
  const isPreviousRoundComplete = (round: number, region: Region): boolean => {
    if (round <= 1) return true;
    
    const prevRound = round - 1;
    const gamesInPrevRound = prevRound === 1 ? 8 : prevRound === 2 ? 4 : prevRound === 3 ? 2 : 1;
    
    for (let g = 1; g <= gamesInPrevRound; g++) {
      const gameId = `${region}-r${prevRound}-g${g}`;
      const pick = picks.get(gameId);
      if (!pick?.choices[0]) return false;
    }
    return true;
  };

  // Get eligible teams for a game (all teams that could advance to this matchup)
  // For rounds 1-2: shows all possible teams
  // For rounds 3-6: only shows teams the user has picked to advance
  const getEligibleTeamsForGame = (round: number, region: Region, gameNum: number): Team[] => {
    const teams = getTeamsForRegion(region);
    
    if (round === 1) {
      // First round - fixed matchups
      const seeds = [
        [1, 16], [8, 9], [5, 12], [4, 13],
        [6, 11], [3, 14], [7, 10], [2, 15],
      ];
      const pair = seeds[gameNum - 1];
      return [
        teams.find((t) => t.seed === pair[0])!,
        teams.find((t) => t.seed === pair[1])!,
      ];
    } else if (round === 2) {
      // Second round - teams from two R1 games
      const gamePairs = [[1, 2], [3, 4], [5, 6], [7, 8]];
      const pair = gamePairs[gameNum - 1];
      const r1Teams1 = getEligibleTeamsForGame(1, region, pair[0]);
      const r1Teams2 = getEligibleTeamsForGame(1, region, pair[1]);
      return [...r1Teams1, ...r1Teams2];
    } else if (round === 3) {
      // Sweet 16 - ONLY show teams user picked to win in Round 2 (2 teams max)
      // Game 1: R2 winners from games 1 & 2
      // Game 2: R2 winners from games 3 & 4
      const gamePairs = [[1, 2], [3, 4]];
      const pair = gamePairs[gameNum - 1];
      const eligibleTeams: Team[] = [];
      
      for (const g of pair) {
        const gameId = `${region}-r2-g${g}`;
        const pick = picks.get(gameId);
        if (pick?.choices[0]) {
          const team = SAMPLE_TEAMS.find((t) => t.id === pick.choices[0]);
          if (team) eligibleTeams.push(team);
        }
        // No fallback - user must complete previous rounds
      }
      return eligibleTeams;
    } else if (round === 4) {
      // Elite 8 - Show ALL teams user picked in Sweet 16 (up to 4 teams: 2 picks per S16 game × 2 games)
      // User has 3 choices (15/10/5 pts) so they need 4 teams to pick from
      const eligibleTeams: Team[] = [];
      
      for (let g = 1; g <= 2; g++) {
        const gameId = `${region}-r3-g${g}`;
        const pick = picks.get(gameId);
        if (pick?.choices.length) {
          // Add ALL S16 picks (up to 2 per game)
          pick.choices.forEach((id) => {
            const team = SAMPLE_TEAMS.find((t) => t.id === id);
            if (team) eligibleTeams.push(team);
          });
        }
      }
      return eligibleTeams;
    }
    
    return [];
  };

  const getMatchupsForRound = (round: number, region: Region) => {
    const matchups: { game: number; eligibleTeams: Team[] }[] = [];

    if (round === 1) {
      for (let g = 1; g <= 8; g++) {
        matchups.push({ game: g, eligibleTeams: getEligibleTeamsForGame(1, region, g) });
      }
    } else if (round === 2) {
      for (let g = 1; g <= 4; g++) {
        matchups.push({ game: g, eligibleTeams: getEligibleTeamsForGame(2, region, g) });
      }
    } else if (round === 3) {
      for (let g = 1; g <= 2; g++) {
        matchups.push({ game: g, eligibleTeams: getEligibleTeamsForGame(3, region, g) });
      }
    } else if (round === 4) {
      matchups.push({ game: 1, eligibleTeams: getEligibleTeamsForGame(4, region, 1) });
    }

    return matchups;
  };

  // Get Final Four eligible teams - ALL teams user picked in Elite 8 for both regions
  // This gives up to 6 teams per semifinal (3 E8 picks per region × 2 regions)
  const getFinalFourMatchups = () => {
    // Get ALL Elite 8 picks (not just winners) for each region
    const getE8Picks = (region: Region): Team[] => {
      const gameId = `${region}-r4-g1`;
      const pick = picks.get(gameId);
      if (!pick?.choices.length) return [];
      // Return all picked teams (up to 3 for E8)
      return pick.choices
        .map((id) => SAMPLE_TEAMS.find((t) => t.id === id))
        .filter((t): t is Team => t !== undefined);
    };
    
    // Semifinal 1: East vs West - show all E8 picks from both regions
    const semi1Teams = [...getE8Picks("East"), ...getE8Picks("West")];
    
    // Semifinal 2: South vs Midwest - show all E8 picks from both regions
    const semi2Teams = [...getE8Picks("South"), ...getE8Picks("Midwest")];
    
    return [
      { game: 1, eligibleTeams: semi1Teams, label: "East vs West" },
      { game: 2, eligibleTeams: semi2Teams, label: "South vs Midwest" },
    ];
  };

  // Get Championship eligible teams - ALL teams user picked in both Final Four games
  // This gives up to 8 teams (4 FF picks per game × 2 games)
  const getChampionshipMatchup = () => {
    const ff1Pick = picks.get("final-four-r5-g1");
    const ff2Pick = picks.get("final-four-r5-g2");
    
    const championshipTeams: Team[] = [];
    
    // Add all picks from Final Four Game 1
    if (ff1Pick?.choices.length) {
      ff1Pick.choices.forEach((id) => {
        const team = SAMPLE_TEAMS.find((t) => t.id === id);
        if (team) championshipTeams.push(team);
      });
    }
    
    // Add all picks from Final Four Game 2
    if (ff2Pick?.choices.length) {
      ff2Pick.choices.forEach((id) => {
        const team = SAMPLE_TEAMS.find((t) => t.id === id);
        if (team) championshipTeams.push(team);
      });
    }
    
    return { game: 1, eligibleTeams: championshipTeams };
  };

  // Wrapper for desktop bracket view - get Final Four teams by semifinal number
  const getFinalFourTeams = (semi: 1 | 2): Team[] => {
    const matchups = getFinalFourMatchups();
    return matchups[semi - 1]?.eligibleTeams || [];
  };

  // Wrapper for desktop bracket view - get Championship teams
  const getChampionshipTeamsForDesktop = (): Team[] => {
    return getChampionshipMatchup().eligibleTeams;
  };

  // Clear picks - full bracket or current round
  const handleClearPicks = (mode: "full" | "round") => {
    if (mode === "full") {
      setPicks(new Map());
      setTiebreaker("");
      toast.success("All bracket picks cleared");
    } else {
      // Clear only current round picks
      const newPicks = new Map(picks);
      const keysToDelete: string[] = [];
      
      newPicks.forEach((pick, key) => {
        if (pick.round === currentRound) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach((key) => newPicks.delete(key));
      setPicks(newPicks);
      toast.success(`Round ${currentRound} picks cleared`);
    }
    setShowClearDialog(false);
  };

  // Parse round number from gameId string
  const getRoundFromGameId = (gameId: string): number => {
    const match = gameId.match(/-r(\d+)-/);
    return match ? parseInt(match[1]) : currentRound;
  };

  const handlePick = (gameId: string, teamId: string, choiceRank: number) => {
    const currentPick = picks.get(gameId);
    const round = getRoundFromGameId(gameId);
    const maxChoices = getChoicesForRound(round);
    
    let newChoices: string[] = currentPick?.choices || [];
    
    // Remove the team if it's already in choices
    newChoices = newChoices.filter((id) => id !== teamId);
    
    // If choiceRank > 0, insert at the correct position (otherwise just remove)
    if (choiceRank > 0 && choiceRank <= maxChoices) {
      newChoices.splice(choiceRank - 1, 0, teamId);
      // Trim to max choices
      newChoices = newChoices.slice(0, maxChoices);
    }

    setPicks(new Map(picks.set(gameId, {
      gameId,
      round,
      choices: newChoices,
    })));
  };

  const getProgress = () => {
    // Count fully completed games (all required choices made)
    let completed = 0;
    const totalGames = 63;

    // R1: 32 games, 1 pick each
    for (const region of REGIONS) {
      for (let g = 1; g <= 8; g++) {
        const p = picks.get(`${region}-r1-g${g}`);
        if (p?.choices?.[0]) completed++;
      }
      // R2: 4 games per region, 1 pick
      for (let g = 1; g <= 4; g++) {
        const p = picks.get(`${region}-r2-g${g}`);
        if (p?.choices?.[0]) completed++;
      }
      // R3: 2 games per region, 2 picks each
      for (let g = 1; g <= 2; g++) {
        const p = picks.get(`${region}-r3-g${g}`);
        if (p?.choices && p.choices.length >= 2) completed++;
      }
      // R4: 1 game per region, 3 picks
      const e8 = picks.get(`${region}-r4-g1`);
      if (e8?.choices && e8.choices.length >= 3) completed++;
    }
    // R5: 2 Final Four games, 4 picks each
    for (let g = 1; g <= 2; g++) {
      const p = picks.get(`final-four-r5-g${g}`);
      if (p?.choices && p.choices.length >= 4) completed++;
    }
    // R6: Championship, 5 picks
    const champ = picks.get("championship-r6-g1");
    if (champ?.choices && champ.choices.length >= 5) completed++;

    return { completed, totalGames, percent: (completed / totalGames) * 100 };
  };

  const getEntryName = () => {
    if (selectedPerson === "self") {
      return session?.user?.name || "My Bracket";
    }
    const member = familyMembers.find((m) => m.id === selectedPerson);
    return member?.name || "Unknown";
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const url = isEditing ? `/api/brackets/${editId}` : "/api/brackets";
      const method = isEditing ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bracketName,
          entryName: getEntryName(),
          status: "DRAFT",
          poolId: userPoolId,
          familyMemberId: selectedPerson === "self" ? null : selectedPerson,
          tiebreaker: tiebreaker === "" ? null : tiebreaker,
          picks: Array.from(picks.values()),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      const bracket = await response.json();
      if (!isEditing) {
        setIsEditing(true);
        setSubmittedBracketId(bracket.id);
        router.replace(`/brackets/new?editId=${bracket.id}`);
      }
      toast.success("Draft saved!");
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const url = isEditing ? `/api/brackets/${editId}` : "/api/brackets";
      const method = isEditing ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bracketName,
          entryName: getEntryName(),
          status: "SUBMITTED",
          poolId: userPoolId,
          familyMemberId: selectedPerson === "self" ? null : selectedPerson,
          tiebreaker: tiebreaker === "" ? null : tiebreaker,
          picks: Array.from(picks.values()),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit");
      }

      const bracket = await response.json();
      setSubmittedBracketId(bracket.id);
      
      // 🎉 Confetti celebration!
      const fireConfetti = () => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#f97316", "#fb923c", "#fbbf24", "#22c55e", "#3b82f6"],
        });
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ["#f97316", "#fb923c", "#fbbf24"],
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ["#f97316", "#fb923c", "#fbbf24"],
          });
        }, 250);
      };
      fireConfetti();
      
      toast.success("🏆 Bracket submitted! Good luck!");
      setShowPaymentModal(true);
    } catch {
      toast.error("Failed to submit bracket");
    } finally {
      setIsSaving(false);
    }
  };

  const scoringRule = SCORING_RULES.find((r) => r.round === currentRound);

  // Validate bracket completion
  const getBracketValidation = () => {
    const errors: string[] = [];
    
    // Check all rounds have required picks
    for (const region of REGIONS) {
      // Round 1: 8 games
      for (let g = 1; g <= 8; g++) {
        const pick = picks.get(`${region}-r1-g${g}`);
        if (!pick?.choices[0]) {
          errors.push(`${region} Round 1 Game ${g}`);
        }
      }
      // Round 2: 4 games
      for (let g = 1; g <= 4; g++) {
        const pick = picks.get(`${region}-r2-g${g}`);
        if (!pick?.choices[0]) {
          errors.push(`${region} Round 2 Game ${g}`);
        }
      }
      // Round 3 (Sweet 16): 2 games, 2 picks each
      for (let g = 1; g <= 2; g++) {
        const pick = picks.get(`${region}-r3-g${g}`);
        if (!pick?.choices || pick.choices.length < 2) {
          errors.push(`${region} Sweet 16 Game ${g}`);
        }
      }
      // Round 4 (Elite 8): 1 game, 3 picks
      const e8Pick = picks.get(`${region}-r4-g1`);
      if (!e8Pick?.choices || e8Pick.choices.length < 3) {
        errors.push(`${region} Elite 8`);
      }
    }
    
    // Final Four: 2 games, 4 picks each
    for (let g = 1; g <= 2; g++) {
      const pick = picks.get(`final-four-r5-g${g}`);
      if (!pick?.choices || pick.choices.length < 4) {
        errors.push(`Final Four Game ${g}`);
      }
    }
    
    // Championship: 1 game, 5 picks
    const champPick = picks.get("championship-r6-g1");
    if (!champPick?.choices || champPick.choices.length < 5) {
      errors.push("Championship");
    }
    
    // Tiebreaker
    if (tiebreaker === "" || tiebreaker === null) {
      errors.push("Tiebreaker");
    }
    
    return {
      isComplete: errors.length === 0,
      missingCount: errors.length,
      errors,
    };
  };

  const validation = getBracketValidation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create Bracket</h1>
          <p className="text-slate-600 mt-1">
            Fill out your picks for each round
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/brackets/upload">
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600"
            onClick={() => {
              if (!validation.isComplete) {
                toast.error(`Bracket incomplete: ${validation.missingCount} items missing`);
                return;
              }
              handleSubmit();
            }}
            disabled={isSaving}
          >
            <Send className="mr-2 h-4 w-4" />
            Submit {!validation.isComplete && `(${validation.missingCount} missing)`}
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          {(() => {
            const progress = getProgress();
            return (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Bracket Progress
                  </span>
                  <span className="text-sm font-semibold">
                    {progress.completed === progress.totalGames ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Complete!
                      </span>
                    ) : (
                      <span className="text-slate-600">
                        {progress.completed} / {progress.totalGames} games
                      </span>
                    )}
                  </span>
                </div>
                <Progress value={progress.percent} className="h-2.5" />
                <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                  {SCORING_RULES.map((rule) => {
                    let done = 0;
                    const total = rule.gamesInRound;
                    if (rule.round <= 4) {
                      for (const region of REGIONS) {
                        const gamesPerRegion = rule.round === 1 ? 8 : rule.round === 2 ? 4 : rule.round === 3 ? 2 : 1;
                        for (let g = 1; g <= gamesPerRegion; g++) {
                          const p = picks.get(`${region}-r${rule.round}-g${g}`);
                          if (p?.choices && p.choices.length >= rule.choices) done++;
                        }
                      }
                    } else if (rule.round === 5) {
                      for (let g = 1; g <= 2; g++) {
                        const p = picks.get(`final-four-r5-g${g}`);
                        if (p?.choices && p.choices.length >= rule.choices) done++;
                      }
                    } else {
                      const p = picks.get("championship-r6-g1");
                      if (p?.choices && p.choices.length >= rule.choices) done++;
                    }
                    const isDone = done === total;
                    return (
                      <span key={rule.round} className={isDone ? "text-green-500 font-medium" : ""}>
                        R{rule.round}: {done}/{total}
                      </span>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Bracket Name & Person Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bracketName">Bracket Name</Label>
              <Input
                id="bracketName"
                value={bracketName}
                onChange={(e) => setBracketName(e.target.value)}
                placeholder="Enter a name for your bracket"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bracketFor">Creating Bracket For</Label>
              <Select value={selectedPerson} onValueChange={setSelectedPerson}>
                <SelectTrigger id="bracketFor">
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Myself ({session?.user?.name})
                    </span>
                  </SelectItem>
                  {familyMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {member.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {familyMembers.length === 0 && (
                <p className="text-xs text-slate-500">
                  <a href="/settings/family" className="text-orange-500 hover:underline">
                    Add family members
                  </a>{" "}
                  to create brackets for them
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Toggle + Download (desktop only) */}
      <div className="hidden lg:flex justify-end gap-1">
        <Button
          variant={viewMode === "card" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("card")}
          className={viewMode === "card" ? "bg-orange-500 hover:bg-orange-600" : ""}
        >
          <LayoutGrid className="mr-1.5 h-4 w-4" />
          Card View
        </Button>
        <Button
          variant={viewMode === "bracket" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("bracket")}
          className={viewMode === "bracket" ? "bg-orange-500 hover:bg-orange-600" : ""}
        >
          <GitBranch className="mr-1.5 h-4 w-4" />
          Bracket View
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const doc = generateBracketPDF(SAMPLE_TEAMS);
            doc.save("picknroll-bracket-2025.pdf");
          }}
        >
          <Download className="mr-1.5 h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Desktop Bracket View */}
      {viewMode === "bracket" && (
        <div className="hidden lg:block">
          <Card>
            <CardContent className="pt-6">
              <DesktopBracketView
                teams={SAMPLE_TEAMS}
                picks={picks}
                onPick={handlePick}
                getEligibleTeamsForGame={getEligibleTeamsForGame}
                getFinalFourTeams={getFinalFourTeams}
                getChampionshipTeams={getChampionshipTeamsForDesktop}
              />
              {/* Tiebreaker in desktop view */}
              <div className="max-w-md mx-auto mt-6">
                <Label htmlFor="tiebreaker-desktop" className="text-sm font-medium">
                  Tiebreaker: Total Combined Score
                </Label>
                <p className="text-xs text-slate-500 mt-1 mb-2">
                  Predict the total combined points of both teams in the championship game
                </p>
                <Input
                  id="tiebreaker-desktop"
                  type="number"
                  min="0"
                  max="300"
                  placeholder="Enter total points (e.g., 145)"
                  value={tiebreaker}
                  onChange={(e) => setTiebreaker(e.target.value === "" ? "" : parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Card-based Round Selection (mobile + card mode on desktop) */}
      <Card className={viewMode === "bracket" ? "lg:hidden" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Round {currentRound}: {scoringRule?.roundName}
              </CardTitle>
              <CardDescription>
                {scoringRule?.choices === 1 ? (
                  `Pick the winner of each game (${scoringRule.pointsPerChoice[0]} pts per correct pick)`
                ) : (
                  `Rank your top ${scoringRule?.choices} choices (${scoringRule?.pointsPerChoice.join("/")} pts)`
                )}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-orange-500 border-orange-500">
              <Info className="mr-1 h-3 w-3" />
              {scoringRule?.choices === 1
                ? `${scoringRule.pointsPerChoice[0]} pts`
                : `${scoringRule?.pointsPerChoice.join("/")} pts`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Round Navigation */}
          <div className="flex flex-col gap-3 mb-4">
            {/* Round Buttons with Labels */}
            <div className="flex justify-center gap-1 sm:gap-1.5">
              {SCORING_RULES.map((rule) => (
                <Button
                  key={rule.round}
                  variant={currentRound === rule.round ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentRound(rule.round)}
                  className={`flex flex-col items-center h-auto py-1.5 px-2 sm:px-3 ${
                    currentRound === rule.round
                      ? "bg-orange-500 hover:bg-orange-600"
                      : ""
                  }`}
                >
                  <span className="text-xs font-bold">R{rule.round}</span>
                  <span className="text-[9px] sm:text-[10px] font-normal leading-tight">{rule.roundName}</span>
                </Button>
              ))}
            </div>
            {/* Prev/Next Buttons + Clear Picks */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                disabled={currentRound === 1}
                onClick={() => setCurrentRound((r) => r - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>
              
              {picks.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setShowClearDialog(true)}
                >
                  Clear Picks
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                disabled={currentRound === 6}
                onClick={() => setCurrentRound((r) => r + 1)}
              >
                <span className="hidden sm:inline">Next Round</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Region Tabs (for rounds 1-4) */}
          {currentRound <= 4 && (
            <Tabs
              value={currentRegion}
              onValueChange={(v) => setCurrentRegion(v as Region)}
            >
              <div className="mb-4">
                <p className="text-xs text-center text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Region</p>
                <TabsList className="grid w-full grid-cols-4">
                  {REGIONS.map((region) => (
                    <TabsTrigger key={region} value={region}>
                      {region}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {REGIONS.map((region) => (
                <TabsContent key={region} value={region}>
                  <div className="grid gap-4 md:grid-cols-2">
                    {!isPreviousRoundComplete(currentRound, region) ? (
                      <div className="col-span-full p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                          <Lock className="h-6 w-6 text-orange-400" />
                        </div>
                        <p className="text-slate-600 font-medium">Complete Round {currentRound - 1} first</p>
                        <p className="text-sm text-slate-500 mt-1">
                          You need to make picks in the previous round before selecting teams here.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => setCurrentRound(currentRound - 1)}
                        >
                          Go to Round {currentRound - 1}
                        </Button>
                      </div>
                    ) : (
                      getMatchupsForRound(currentRound, region).map((matchup) => {
                        const gameId = `${region}-r${currentRound}-g${matchup.game}`;
                        const pick = picks.get(gameId);
                        const maxChoices = scoringRule?.choices || 1;
                        
                        return (
                          <GameCard
                            key={matchup.game}
                            gameNumber={matchup.game}
                            round={currentRound}
                            region={region}
                            eligibleTeams={matchup.eligibleTeams}
                            picks={pick?.choices || []}
                            maxChoices={maxChoices}
                            pointsPerChoice={scoringRule?.pointsPerChoice || [1]}
                            onPick={(teamId, rank) => handlePick(gameId, teamId, rank)}
                          />
                        );
                      })
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}

          {/* Final Four */}
          {currentRound === 5 && (() => {
            const matchups = getFinalFourMatchups();
            const hasTeams = matchups.some((m) => m.eligibleTeams.length > 0);
            
            if (!hasTeams) {
              return (
                <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                    <Lock className="h-6 w-6 text-orange-400" />
                  </div>
                  <p className="text-slate-600 font-medium">Complete Elite 8 first</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Make your Elite 8 picks in all regions to see Final Four teams.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setCurrentRound(4)}
                  >
                    Go to Elite 8
                  </Button>
                </div>
              );
            }
            
            return (
              <div className="grid gap-4 md:grid-cols-2">
                {matchups.map((matchup) => {
                  const gameId = `final-four-r5-g${matchup.game}`;
                  const pick = picks.get(gameId);
                  const maxChoices = scoringRule?.choices || 4;
                  
                  return (
                    <GameCard
                      key={matchup.game}
                      gameNumber={matchup.game}
                      round={5}
                      region={matchup.label}
                      eligibleTeams={matchup.eligibleTeams}
                      picks={pick?.choices || []}
                      maxChoices={maxChoices}
                      pointsPerChoice={scoringRule?.pointsPerChoice || [1]}
                      onPick={(teamId, rank) => handlePick(gameId, teamId, rank)}
                    />
                  );
                })}
              </div>
            );
          })()}

          {/* Championship */}
          {currentRound === 6 && (() => {
            const matchup = getChampionshipMatchup();
            const gameId = "championship-r6-g1";
            const pick = picks.get(gameId);
            const maxChoices = scoringRule?.choices || 5;
            
            if (matchup.eligibleTeams.length === 0) {
              return (
                <div className="max-w-md mx-auto p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  <div className="mx-auto w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                    <Trophy className="h-7 w-7 text-orange-400" />
                  </div>
                  <p className="text-slate-600 font-medium">Complete Final Four first</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Make your Final Four picks to see Championship teams.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setCurrentRound(5)}
                  >
                    Go to Final Four
                  </Button>
                </div>
              );
            }
            
            return (
              <div className="max-w-md mx-auto space-y-4">
                <GameCard
                  gameNumber={1}
                  round={6}
                  region="Championship"
                  eligibleTeams={matchup.eligibleTeams}
                  picks={pick?.choices || []}
                  maxChoices={maxChoices}
                  pointsPerChoice={scoringRule?.pointsPerChoice || [1]}
                  onPick={(teamId, rank) => handlePick(gameId, teamId, rank)}
                />
                
                {/* Tiebreaker */}
                <Card>
                  <CardContent className="pt-6">
                    <Label htmlFor="tiebreaker" className="text-sm font-medium">
                      Tiebreaker: Total Combined Score
                    </Label>
                    <p className="text-xs text-slate-500 mt-1 mb-2">
                      Predict the total combined points of both teams in the championship game 
                      (e.g., Team A = 45 + Team B = 50 = 95 total)
                    </p>
                    <Input
                      id="tiebreaker"
                      type="number"
                      min="0"
                      max="300"
                      placeholder="Enter total points (e.g., 145)"
                      value={tiebreaker}
                      onChange={(e) => setTiebreaker(e.target.value === "" ? "" : parseInt(e.target.value))}
                      className="w-full"
                    />
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Bottom Round Navigation */}
      <Card className={viewMode === "bracket" ? "lg:hidden" : ""}>
        <CardContent className="py-4 space-y-4">
          {/* Region/Division Tabs (for rounds 1-4) */}
          {currentRound <= 4 && (
            <div className="flex flex-col items-center">
              <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Region</p>
              <div className="inline-flex rounded-lg border p-1 bg-muted">
                {REGIONS.map((region) => (
                  <Button
                    key={region}
                    variant={currentRegion === region ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setCurrentRegion(region);
                      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
                    }}
                    className={
                      currentRegion === region
                        ? "bg-orange-500 hover:bg-orange-600"
                        : ""
                    }
                  >
                    {region}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {/* Round Navigation */}
          <div className="flex flex-col gap-3">
            {/* Round Buttons with Labels */}
            <div className="flex justify-center gap-1 sm:gap-1.5">
              {SCORING_RULES.map((rule) => (
                <Button
                  key={rule.round}
                  variant={currentRound === rule.round ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCurrentRound(rule.round);
                    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
                  }}
                  className={`flex flex-col items-center h-auto py-1.5 px-2 sm:px-3 ${
                    currentRound === rule.round
                      ? "bg-orange-500 hover:bg-orange-600"
                      : ""
                  }`}
                >
                  <span className="text-xs font-bold">R{rule.round}</span>
                  <span className="text-[9px] sm:text-[10px] font-normal leading-tight">{rule.roundName}</span>
                </Button>
              ))}
            </div>
            {/* Prev/Next Buttons */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={currentRound === 1}
                onClick={() => {
                  setCurrentRound((r) => r - 1);
                  setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
                }}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentRound === 6}
                onClick={() => {
                  setCurrentRound((r) => r + 1);
                  setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
                }}
              >
                <span className="hidden sm:inline">Next Round</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Instructions Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Bracket Submitted!
            </DialogTitle>
            <DialogDescription>
              Your bracket has been submitted successfully. Please complete payment to finalize your entry.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-orange-600" />
                <span className="font-semibold text-orange-900">Entry Fee: $5.00</span>
              </div>
              <p className="text-sm text-orange-700">
                Payment is required to be eligible for prizes.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-slate-900">Payment Options:</h4>
              
              {/* Venmo */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">V</span>
                  </div>
                  <div>
                    <p className="font-medium">Venmo</p>
                    <p className="text-sm text-slate-500">@PoolAdmin</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText("@PoolAdmin");
                    toast.success("Copied to clipboard!");
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>

              {/* PayPal */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">P</span>
                  </div>
                  <div>
                    <p className="font-medium">PayPal</p>
                    <p className="text-sm text-slate-500">pool@example.com</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open("https://paypal.me/pooladmin", "_blank");
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Pay
                </Button>
              </div>

              {/* Cash App */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">$</span>
                  </div>
                  <div>
                    <p className="font-medium">Cash App</p>
                    <p className="text-sm text-slate-500">$PoolAdmin</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText("$PoolAdmin");
                    toast.success("Copied to clipboard!");
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Include your name &quot;{getEntryName()}&quot; in the payment note.
              <br />
              Your entry will be marked as paid once confirmed by the admin.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentModal(false);
                router.push("/brackets");
              }}
            >
              I&apos;ll Pay Later
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                setShowPaymentModal(false);
                router.push("/brackets");
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Picks Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Clear Picks</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear your picks? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start border-red-200 hover:bg-red-50 hover:border-red-300"
              onClick={() => handleClearPicks("round")}
            >
              <div className="text-left">
                <p className="font-medium">Clear Current Round</p>
                <p className="text-xs text-slate-500">
                  Only clear picks for Round {currentRound} ({scoringRule?.roundName})
                </p>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start border-red-300 hover:bg-red-100 hover:border-red-400 text-red-600"
              onClick={() => handleClearPicks("full")}
            >
              <div className="text-left">
                <p className="font-medium">Clear Entire Bracket</p>
                <p className="text-xs text-red-400">
                  Remove all picks from all rounds
                </p>
              </div>
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowClearDialog(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NewBracketPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>}>
      <NewBracketContent />
    </Suspense>
  );
}
