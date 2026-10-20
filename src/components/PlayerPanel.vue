<script setup lang="ts">
import type { Player } from "../types/game";

defineProps<{
  players: Player[];
  currentPlayerId: string;
}>();
</script>

<template>
  <section class="panel player-panel">
    <header class="panel-heading">
      <div>
        <span class="panel-kicker">Peserta</span>
        <h2>Pemain</h2>
      </div>
      <span class="player-count">{{ players.length }}</span>
    </header>

    <div class="player-panel-list">
      <article
        v-for="player in players"
        :key="player.id"
        class="player-card"
        :class="{
          'player-active': player.id === currentPlayerId,
        }"
        :style="{ '--player-accent': player.color }"
      >
        <span class="player-avatar" aria-hidden="true">
          {{ player.name.slice(0, 1).toUpperCase() }}
        </span>

        <div class="player-details">
          <div class="player-name-row">
            <strong>{{ player.name }}</strong>
            <span
              v-if="player.id === currentPlayerId"
              class="active-badge"
            >
              Sedang bermain
            </span>
          </div>

          <span class="cash-label">Saldo</span>
          <p class="player-cash">
            Rp{{ player.cash.toLocaleString("id-ID") }}
          </p>

          <div class="player-meta">
            <span>Petak {{ player.position + 1 }}</span>
            <span>{{ player.status }}</span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
