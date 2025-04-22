<script lang="ts">
    import { fade } from 'svelte/transition';
    export let player: {
        id: string;
        name: string;
        word: string;
        isUndercover: boolean;
    };
    export let isActive: boolean;
    export let onClose: () => void;
    export let onSelect: () => void;
    
    let isRevealed = false;
    let showConfirm = false;

    $: if (!isActive && isRevealed) {
        isRevealed = false;
        showConfirm = false;
    }

    function handleReveal(e: MouseEvent) {
        // Stop propagation for close button click
        if ((e.target as HTMLElement).closest('button')) {
            return;
        }
        
        if (isActive) {
            showConfirm = true;
        } else {
            onSelect();
            showConfirm = true;
        }
    }

    function confirmReveal() {
        isRevealed = true;
        showConfirm = false;
    }
</script>

<div class="relative p-4 rounded-lg shadow-md transition-all duration-300"
    class:bg-red-50={player.isUndercover && isRevealed}
    class:bg-green-50={!player.isUndercover && isRevealed}
    class:bg-gray-50={!isRevealed}
    class:cursor-pointer={!isRevealed}
    class:border-2={isActive}
    class:border-blue-500={isActive}
    on:click={!isRevealed ? handleReveal : undefined}>
    <div class="flex justify-between items-start">
        <h3 class="font-bold text-xl">{player.name}</h3>
        {#if isRevealed}
            <button 
                class="text-gray-500 hover:text-gray-700"
                on:click|stopPropagation={onClose}
            >
                Close
            </button>
        {/if}
    </div>
    
    {#if isRevealed}
        <p class="mt-4 text-center font-semibold">Your word: {player.word}</p>
        <p class="mt-2 text-sm text-center text-gray-600">
            You are {player.isUndercover ? 'an Undercover' : 'a Civilian'}
        </p>
    {:else}
        <div class="mt-4 text-center text-gray-600">
            Click to reveal your word
        </div>
    {/if}
</div>

{#if showConfirm}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" transition:fade>
        <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h4 class="text-lg font-bold mb-4">Confirm Reveal</h4>
            <p>Are you {player.name}? This action cannot be undone.</p>
            <div class="mt-6 flex justify-end gap-4">
                <button 
                    class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                    on:click={() => showConfirm = false}>
                    Cancel
                </button>
                <button 
                    class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    on:click={confirmReveal}>
                    Confirm
                </button>
            </div>
        </div>
    </div>
{/if}