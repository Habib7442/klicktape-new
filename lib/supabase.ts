import { AppState, Platform } from "react-native";
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Database } from '@/types/supabase';

// Get Supabase configuration from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  throw new Error(`Missing required Supabase environment variables: ${missing.join(', ')}`);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // Optimize database connection
  db: {
    schema: 'public',
  },
  // Add connection pooling for better performance
  global: {
    headers: {
      'x-client-info': 'klicktape-mobile',
    },
  },
});

// Helper function to ensure supabase client is available
export const getSupabaseClient = () => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }
  return supabase;
};

// Generate random username
export const generateUsername = () => {
  const adjectives = [
    "Swift",
    "Brave",
    "Clever",
    "Mighty",
    "Noble",
    "Funny",
    "Happy",
    "Lucky",
    "Epic",
    "Cool",
    "Agile",
    "Bold",
    "Bright",
    "Calm",
    "Daring",
    "Eager",
    "Fierce",
    "Gentle",
    "Honest",
    "Jolly",
    "Keen",
    "Lively",
    "Mystic",
    "Proud",
    "Quick",
    "Radiant",
    "Silent",
    "Valiant",
    "Wise",
    "Witty",
    "Zesty",
    "Adventurous",
    "Ambitious",
    "Breezy",
    "Charming",
    "Dazzling",
    "Energetic",
    "Fabulous",
    "Glorious",
    "Harmonious",
    "Incredible",
    "Joyful",
    "Kind",
    "Legendary",
    "Majestic",
    "Nimble",
    "Optimistic",
    "Playful",
    "Quirky",
    "Reliable",
    "Sincere",
    "Tough",
    "Unique",
    "Vibrant",
    "Wild",
    "Youthful",
    "Zealous",
    "Artistic",
    "Blissful",
    "Courageous",
    "Dynamic",
    "Enthusiastic",
    "Fearless",
    "Graceful",
    "Heroic",
    "Innovative",
    "Jubilant",
    "Knowledgeable",
    "Luminous",
    "Magical",
    "Noble",
    "Outstanding",
    "Passionate",
    "Quiet",
    "Resilient",
    "Spirited",
    "Tenacious",
    "Unstoppable",
    "Vivid",
    "Wondrous",
    "Xtraordinary",
    "Yearning",
    "Zippy",
    "Astonishing",
    "Brilliant",
    "Curious",
    "Dependable",
    "Exuberant",
    "Friendly",
    "Generous",
    "Hopeful",
    "Intrepid",
    "Jovial",
    "Knightly",
    "Loyal",
    "Marvelous",
    "Nifty",
    "Observant",
    "Peaceful",
    "Radiant",
  ];
  const nouns = [
    "Panda",
    "Eagle",
    "Tiger",
    "Dragon",
    "Knight",
    "Ninja",
    "Hero",
    "Wizard",
    "Phoenix",
    "Warrior",
    "Archer",
    "Bear",
    "Champion",
    "Falcon",
    "Gladiator",
    "Hawk",
    "Jaguar",
    "Lion",
    "Mage",
    "Panther",
    "Ranger",
    "Samurai",
    "Scout",
    "Sentinel",
    "Sparrow",
    "Titan",
    "Viper",
    "Wolf",
    "Yeti",
    "Zebra",
    "Ace",
    "Blaze",
    "Comet",
    "Duke",
    "Ember",
    "Flame",
    "Ghost",
    "Hunter",
    "Iron",
    "Jester",
    "King",
    "Lynx",
    "Mystic",
    "Nomad",
    "Oracle",
    "Pioneer",
    "Queen",
    "Rogue",
    "Sage",
    "Thunder",
    "Unicorn",
    "Vortex",
    "Warden",
    "Xeno",
    "Yak",
    "Zealot",
    "Alchemist",
    "Bard",
    "Crusader",
    "Druid",
    "Enchanter",
    "Falconer",
    "Guardian",
    "Harbinger",
    "Illusionist",
    "Juggernaut",
    "Keeper",
    "Lancer",
    "Marauder",
    "Necromancer",
    "Outlaw",
    "Paladin",
    "Quasar",
    "Revenant",
    "Sorcerer",
    "Templar",
    "Ursa",
    "Valkyrie",
    "Warlock",
    "Xerophyte",
    "Yogi",
    "Zeppelin",
    "Aviator",
    "Berserker",
    "Corsair",
    "Dragoon",
    "Explorer",
    "Fury",
    "Gryphon",
    "Hoplite",
    "Inquisitor",
    "Juggler",
    "Kraken",
    "Leviathan",
    "Minstrel",
    "Navigator",
    "Obelisk",
    "Pegasus",
    "Quill",
    "Ronin",
  ];
  const number = Math.floor(Math.random() * 1000);

  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${randomAdjective}${randomNoun}${number}`;
};

// Generate anonymous room name
export const generateAnonymousRoomName = () => {
  const roomAdjectives = [
    "Hidden",
    "Secret",
    "Mystic",
    "Shadow",
    "Cosmic",
    "Ethereal",
    "Whisper",
    "Silent",
    "Enigma",
    "Phantom",
    "Veiled",
    "Clandestine",
    "Covert",
    "Obscure",
    "Arcane",
    "Cryptic",
    "Stealth",
    "Masked",
    "Anonymous",
    "Incognito",
    "Unseen",
    "Invisible",
    "Shrouded",
    "Concealed",
    "Secluded",
    "Private",
    "Discreet",
    "Confidential",
    "Undisclosed",
    "Mysterious",
    "Twilight",
    "Midnight",
    "Nebula",
    "Celestial",
    "Astral",
    "Lunar",
    "Solar",
    "Stellar",
    "Galactic",
    "Cosmic",
    "Quantum",
    "Void",
    "Abyss",
    "Echo",
    "Mirage",
    "Illusion",
    "Dream",
    "Enchanted",
    "Magical",
    "Mystical",
    "Occult",
    "Esoteric",
    "Forbidden",
    "Sacred",
    "Divine",
    "Eternal",
    "Infinite",
    "Boundless",
    "Limitless",
    "Timeless",
  ];

  const roomNouns = [
    "Haven",
    "Sanctuary",
    "Realm",
    "Domain",
    "Chamber",
    "Vault",
    "Hideaway",
    "Retreat",
    "Refuge",
    "Oasis",
    "Nexus",
    "Portal",
    "Gateway",
    "Passage",
    "Corridor",
    "Labyrinth",
    "Maze",
    "Cavern",
    "Grotto",
    "Hollow",
    "Cove",
    "Alcove",
    "Nook",
    "Corner",
    "Pocket",
    "Dimension",
    "Plane",
    "Sphere",
    "Orbit",
    "Cosmos",
    "Universe",
    "Galaxy",
    "Constellation",
    "Nebula",
    "Vortex",
    "Whirlpool",
    "Tempest",
    "Storm",
    "Cyclone",
    "Typhoon",
    "Hurricane",
    "Tsunami",
    "Wave",
    "Tide",
    "Current",
    "Stream",
    "River",
    "Lake",
    "Ocean",
    "Sea",
    "Island",
    "Atoll",
    "Archipelago",
    "Peninsula",
    "Isthmus",
    "Continent",
    "World",
    "Planet",
    "Moon",
    "Star",
    "Comet",
  ];

  const number = Math.floor(Math.random() * 1000);

  const randomRoomAdjective =
    roomAdjectives[Math.floor(Math.random() * roomAdjectives.length)];
  const randomRoomNoun =
    roomNouns[Math.floor(Math.random() * roomNouns.length)];

  return `${randomRoomAdjective}${randomRoomNoun}${number}`;
};

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
AppState.addEventListener("change", (state) => {
  try {
    const client = getSupabaseClient();
    if (state === "active") {
      client.auth.startAutoRefresh();
    } else {
      client.auth.stopAutoRefresh();
    }
  } catch (error) {
    console.warn('Supabase client not available for auth refresh:', error);
  }
});
