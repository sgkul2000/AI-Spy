import { writable } from 'svelte/store';

export type Player = {
    id: string;
    name: string;
    word: string;
    isUndercover: boolean;
    isEliminated?: boolean;
    votes?: number;
    points?: number;
};

export interface GameState {
    players: Player[];
    interests: string;
    commonWord: string;
    undercoverWord: string;
    isGameStarted: boolean;
    currentRound: number;
    isVotingPhase: boolean;
    currentVoter?: string;
    votingComplete: boolean;
    activeCardPlayer?: string;
    gameOver: boolean;
    winner?: string;
    eliminatedPlayers: Player[];
}

const initialState: GameState = {
    players: [],
    interests: '',
    commonWord: '',
    undercoverWord: '',
    isGameStarted: false,
    currentRound: 0,
    isVotingPhase: false,
    votingComplete: false,
    activeCardPlayer: undefined,
    gameOver: false,
    winner: undefined,
    eliminatedPlayers: []
};

export const gameStore = writable<GameState>(initialState);