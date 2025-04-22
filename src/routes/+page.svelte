<script lang="ts">
    import { gameStore, type Player } from '$lib/stores/gameStore';
    import { generateWordPair } from '$lib/services/gemini';
    import PlayerCard from '$lib/components/PlayerCard.svelte';
    import { fade } from 'svelte/transition';

    let playerName = '';
    let loading = false;

    async function startGame() {
        if ($gameStore.players.length < 4) {
            alert('Minimum 4 players required!');
            return;
        }

        loading = true;
        try {
            const [commonWord, undercoverWord] = await generateWordPair($gameStore.interests);
            
            const undercoverCount = Math.max(1, Math.floor($gameStore.players.length * 0.2));
            const shuffledPlayers = [...$gameStore.players].sort(() => Math.random() - 0.5);
            
            const updatedPlayers = shuffledPlayers.map((player, index) => ({
                ...player,
                isUndercover: index < undercoverCount,
                word: index < undercoverCount ? undercoverWord : commonWord
            }));

            gameStore.update(state => ({
                ...state,
                players: updatedPlayers,
                commonWord,
                undercoverWord,
                isGameStarted: true
            }));
        } catch (error) {
            console.error('Error generating words:', error);
            alert('Error generating words. Please try again.');
        }
        loading = false;
    }

    function addPlayer() {
        if (!playerName.trim()) return;
        
        const newPlayer: Player = {
            id: crypto.randomUUID(),
            name: playerName,
            word: '',
            isUndercover: false
        };

        gameStore.update(state => ({
            ...state,
            players: [...state.players, newPlayer]
        }));
        
        playerName = '';
    }

    function resetGame() {
        gameStore.update(state => ({
            players: state.players.map(p => ({
                ...p,
                word: '',
                isUndercover: false,
                isEliminated: false,
                votes: 0
            })),
            interests: state.interests,
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
        }));
    }

    function startVoting() {
        gameStore.update(state => ({
            ...state,
            isVotingPhase: true,
            currentVoter: state.players[0].id,
            votingComplete: false
        }));
    }

    let eliminatedPlayerName = '';
    let showEliminationPopup = false;

    function vote(votedPlayerId: string) {
        gameStore.update(state => {
            const currentVoterIndex = state.players.findIndex(p => p.id === state.currentVoter);
            const nextVoterIndex = state.players.findIndex((p, i) => 
                i > currentVoterIndex && !p.isEliminated
            );

            const updatedPlayers = state.players.map(p => 
                p.id === votedPlayerId 
                    ? { ...p, votes: (p.votes || 0) + 1 }
                    : p
            );

            const votingComplete = nextVoterIndex === -1;
            if (votingComplete) {
                const maxVotes = Math.max(...updatedPlayers.map(p => p.votes || 0));
                const playersWithMaxVotes = updatedPlayers.filter(p => p.votes === maxVotes);
                
                if (playersWithMaxVotes.length > 1) {
                    // Reset votes and continue to next round
                    return {
                        ...state,
                        players: updatedPlayers.map(p => ({ ...p, votes: 0 })),
                        currentRound: state.currentRound + 1,
                        isVotingPhase: false,
                        votingComplete: false
                    };
                }

                const eliminated = playersWithMaxVotes[0];
                eliminated.isEliminated = true;
                eliminatedPlayerName = eliminated.name;
                showEliminationPopup = true;
                
                // Check remaining players count
                const remainingPlayers = updatedPlayers.filter(p => !p.isEliminated);
                if (remainingPlayers.length === 2) {
                    const hasUndercover = remainingPlayers.some(p => p.isUndercover);
                    if (hasUndercover) {
                        // Undercover wins in 1v1
                        return {
                            ...state,
                            players: updatedPlayers.map(p => ({
                                ...p,
                                points: (p.points || 0) + (p.isUndercover ? 10 : 0)
                            })),
                            isGameStarted: false,
                            gameOver: true,
                            winner: 'undercover'
                        };
                    }
                }

                // Check if undercover players are all eliminated
                const remainingUndercover = updatedPlayers.filter(p => !p.isEliminated && p.isUndercover).length;
                if (remainingUndercover === 0) {
                    return {
                        ...state,
                        players: updatedPlayers.map(p => ({
                            ...p,
                            points: (p.points || 0) + (!p.isUndercover ? 2 : 0)
                        })),
                        isGameStarted: false,
                        gameOver: true,
                        winner: 'civilians'
                    };
                }
                
                // Check if civilians are equal to undercover
                const remainingCivilians = updatedPlayers.filter(p => !p.isEliminated && !p.isUndercover).length;
                if (remainingCivilians <= remainingUndercover) {
                    return {
                        ...state,
                        players: updatedPlayers.map(p => ({
                            ...p,
                            points: (p.points || 0) + (p.isUndercover ? 10 : 0)
                        })),
                        isGameStarted: false,
                        gameOver: true,
                        winner: 'undercover'
                    };
                }
            }

            return {
                ...state,
                players: updatedPlayers,
                currentVoter: votingComplete ? undefined : state.players[nextVoterIndex].id,
                votingComplete,
                currentRound: votingComplete ? state.currentRound + 1 : state.currentRound
            };
        });
    }
</script>

<!-- Add this section before the main game content -->
{#if $gameStore.gameOver}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4 space-y-6">
            <h2 class="text-3xl font-bold text-center">
                Game Over!
            </h2>
            <div class="space-y-4">
                <p class="text-xl text-center">
                    {$gameStore.gameOver && $gameStore.winner === 'civilians'
                        ? 'Civilians have won! All undercover agents were eliminated.' 
                        : 'Undercover agents have won! They have matched the number of civilians.'}
                </p>
                
                <div class="space-y-2">
                    <h3 class="font-semibold">Final Results:</h3>
                    <ul class="space-y-2">
                        {#each $gameStore.players as player}
                            <li class="p-2 rounded {player.isUndercover ? 'bg-red-100' : 'bg-green-100'}">
                                <span class="font-medium">{player.name}</span> - 
                                {player.isUndercover ? 'Undercover Agent' : 'Civilian'}
                                {#if player.isEliminated}
                                    <span class="text-red-600"> (Eliminated)</span>
                                {/if}
                            </li>
                        {/each}
                    </ul>
                </div>

                <button
                    on:click={resetGame}
                    class="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    Back to Main Menu
                </button>
            </div>
        </div>
    </div>
{/if}

<main class="container mx-auto p-4 max-w-2xl">

    {#if !$gameStore.isGameStarted}
        <div class="space-y-6">
            <div class="space-y-2">
                <label class="block">Interests (for word generation):</label>
                <input
                    type="text"
                    bind:value={$gameStore.interests}
                    class="w-full p-2 border rounded"
                    placeholder="e.g., sports, movies, food"
                />
            </div>

            <div class="space-y-2">
                <label class="block">Add Player:</label>
                <div class="flex gap-2">
                    <input
                        type="text"
                        bind:value={playerName}
                        class="flex-1 p-2 border rounded"
                        placeholder="Player name"
                    />
                    <button
                        on:click={addPlayer}
                        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Add
                    </button>
                </div>
                <p class="text-sm text-gray-600 mt-1">Minimum 4 players required to start the game</p>
            </div>

            {#if $gameStore.players.length > 0}
                <div class="space-y-2">
                    <h2 class="text-xl font-semibold">Players</h2>
                    <ul class="space-y-2">
                        {#each $gameStore.players as player}
                            <li class="p-2 bg-gray-100 rounded">{player.name}</li>
                        {/each}
                    </ul>
                </div>
            {/if}

            <button
                on:click={startGame}
                disabled={loading || $gameStore.players.length < 4 || !$gameStore.interests}
                class="w-full p-2 bg-green-500 text-white rounded disabled:opacity-50 hover:bg-green-600"
            >
                {loading ? 'Generating words...' : 'Start Game'}
            </button>
        </div>
    {#if !$gameStore.isGameStarted}
        <div class="space-y-6">
            <!-- Existing player input and game start controls -->

            {#if $gameStore.players.some(p => p.points)}
                <div class="mt-8 p-4 bg-white rounded-lg shadow">
                    <h2 class="text-xl font-semibold mb-4">Scoreboard</h2>
                    <div class="space-y-2">
                        {#each $gameStore.players.sort((a, b) => (b.points || 0) - (a.points || 0)) as player}
                            <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span class="font-medium">{player.name}</span>
                                <span class="text-gray-600">{player.points || 0} points</span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    {/if}
    {:else}
        <!-- Replace the existing game started section with: -->
        {#if $gameStore.isGameStarted}
            <div class="space-y-6">
                <h2 class="text-2xl font-semibold text-center">Round {$gameStore.currentRound + 1}</h2>
                
                {#if !$gameStore.isVotingPhase}
                    <div class="space-y-4">
                        <div class="grid gap-4 md:grid-cols-2">
                            {#each $gameStore.players.filter(p => !p.isEliminated).sort((a, b) => a.name.localeCompare(b.name)) as player}
                                <PlayerCard 
                                    {player} 
                                    isActive={$gameStore.activeCardPlayer === player.id}
                                    onClose={() => gameStore.update(state => ({ ...state, activeCardPlayer: '' }))}
                                    onSelect={() => gameStore.update(state => ({ ...state, activeCardPlayer: player.id }))}
                                />
                            {/each}
                        </div>
                        
                        <button
                            on:click={startVoting}
                            class="w-full p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        >
                            Begin Voting
                        </button>
                    </div>
                {:else}
                    <div class="space-y-4">
                        <h3 class="text-xl text-center">
                            {$gameStore.votingComplete 
                                ? 'Voting Complete!' 
                                : `${$gameStore.players.find(p => p.id === $gameStore.currentVoter)?.name}'s turn to vote`}
                        </h3>
                        
                        <div class="grid gap-4 md:grid-cols-2">
                            {#each $gameStore.players.filter(p => !p.isEliminated) as player}
                                <div 
                                    class="p-4 border rounded-lg text-center"
                                    class:opacity-50={player.id === $gameStore.currentVoter || $gameStore.votingComplete}
                                >
                                    <h4 class="font-bold">{player.name}</h4>
                                    {#if player.id === $gameStore.currentVoter}
                                        <p class="mt-2 text-sm text-gray-500">Current Voter</p>
                                    {:else if !$gameStore.votingComplete}
                                        <button
                                            class="mt-2 px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
                                            on:click={() => vote(player.id)}
                                        >
                                            Vote
                                        </button>
                                    {/if}
                                    {#if $gameStore.votingComplete}
                                        <p class="mt-2">Votes: {player.votes || 0}</p>
                                    {/if}
                                </div>
                            {/each}
                        </div>

                        {#if $gameStore.votingComplete}
                            <button
                                on:click={() => gameStore.update(s => ({ ...s, isVotingPhase: false }))}
                                class="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Continue Game
                            </button>
                        {/if}
                    </div>
                {/if}
    
                <!-- Replace the End Game button with this floating button -->
                <button
                    on:click={resetGame}
                    class="fixed bottom-8 right-8 p-4 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    title="End Game"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>
        {/if}
    {/if}
</main>

<!-- Add this before the main content -->
{#if showEliminationPopup}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" transition:fade>
        <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4 text-center">
            <h4 class="text-xl font-bold mb-4">Player Eliminated!</h4>
            <p class="text-lg mb-6">{eliminatedPlayerName} has been voted out!</p>
            <button 
                class="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                on:click={() => {
                    showEliminationPopup = false;
                    gameStore.update(s => ({ ...s, isVotingPhase: false }));
                }}
            >
                Continue
            </button>
        </div>
    </div>
{/if}

<style>
    :global(body) {
        background-color: #f9fafb;
    }
</style>
