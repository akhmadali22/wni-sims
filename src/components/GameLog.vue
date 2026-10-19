<script setup lang="ts">
import type { GameLogEntry } from "../types/game";

defineProps<{
  logs: GameLogEntry[];
}>();
</script>

<template>
  <section class="panel">
    <h2>Log Permainan</h2>

    <ol class="game-log">
      <li
        v-for="log in [...logs].reverse()"
        :key="log.id"
      >
        <small>Giliran {{ log.turn }}</small>
        <p>{{ log.message }}</p>
      </li>
    </ol>
  </section>
</template>
