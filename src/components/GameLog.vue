<script setup lang="ts">
import type { GameLogEntry } from "../types/game";

defineProps<{
  logs: GameLogEntry[];
}>();
</script>

<template>
  <section class="panel log-panel">
    <header class="panel-heading">
      <div>
        <span class="panel-kicker">Aktivitas terbaru</span>
        <h2>Perjalanan Permainan</h2>
      </div>
    </header>

    <ol v-if="logs.length" class="game-log">
      <li
        v-for="log in [...logs].reverse()"
        :key="log.id"
      >
        <span class="log-marker" aria-hidden="true" />
        <small>Giliran {{ log.turn }}</small>
        <p>{{ log.message }}</p>
      </li>
    </ol>

    <p v-else class="empty-log">
      Aktivitas permainan akan muncul di sini.
    </p>
  </section>
</template>
