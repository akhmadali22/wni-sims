<script setup lang="ts">
import type { Player } from "../types/game";

defineProps<{
  players: Player[];
  currentPlayerId: string;
}>();
</script>

<template>
  <section class="panel">
    <h2>Pemain</h2>

    <article
      v-for="player in players"
      :key="player.id"
      class="player-card"
      :class="{
        'player-active': player.id === currentPlayerId,
      }"
    >
      <span
        class="player-color"
        :style="{ backgroundColor: player.color }"
      />

      <div>
        <strong>{{ player.name }}</strong>
        <p>Uang: Rp{{ player.cash.toLocaleString("id-ID") }}</p>
        <p>Posisi: {{ player.position + 1 }}</p>
        <p>Status: {{ player.status }}</p>
      </div>
    </article>
  </section>
</template>
