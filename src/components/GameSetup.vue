<script setup lang="ts">
import { ref } from "vue";

import {
  DEFAULT_INITIAL_CASH,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from "../config/game";

const emit = defineEmits<{
  start: [playerNames: string[]];
}>();

const playerNames = ref<string[]>(
  Array.from({ length: MIN_PLAYERS }, () => ""),
);
const errorMessage = ref("");

function addPlayer() {
  if (playerNames.value.length < MAX_PLAYERS) {
    playerNames.value.push("");
  }
}

function removePlayer(index: number) {
  if (playerNames.value.length > MIN_PLAYERS) {
    playerNames.value.splice(index, 1);
  }
}

function submit() {
  const names = playerNames.value.map((name) => name.trim());
  if (names.some((name) => !name)) {
    errorMessage.value = "Semua nama pemain wajib diisi.";
    return;
  }
  errorMessage.value = "";
  emit("start", names);
}
</script>

<template>
  <section class="setup panel" aria-labelledby="setup-title">
    <span class="setup-kicker">Mulai petualangan</span>
    <h2 id="setup-title">Siapkan Permainan</h2>
    <p class="setup-intro">
      Pilih {{ MIN_PLAYERS }}–{{ MAX_PLAYERS }} pemain. Setiap pemain
      memulai dengan Rp{{ DEFAULT_INITIAL_CASH.toLocaleString("id-ID") }}.
    </p>

    <form @submit.prevent="submit">
      <div
        v-for="(_, index) in playerNames"
        :key="index"
        class="player-input"
      >
        <span class="setup-player-number">{{ index + 1 }}</span>
        <label :for="`player-name-${index}`">Pemain {{ index + 1 }}</label>
        <input
          :id="`player-name-${index}`"
          v-model="playerNames[index]"
          type="text"
          required
          maxlength="40"
          autocomplete="off"
        />
        <button
          v-if="playerNames.length > MIN_PLAYERS"
          type="button"
          class="secondary-button"
          @click="removePlayer(index)"
        >
          Hapus
        </button>
      </div>

      <p v-if="errorMessage" class="setup-error" role="alert">
        {{ errorMessage }}
      </p>

      <div class="setup-actions">
        <button
          type="button"
          class="secondary-button"
          :disabled="playerNames.length >= MAX_PLAYERS"
          @click="addPlayer"
        >
          Tambah Pemain
        </button>
        <button type="submit">Mulai Permainan</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.setup {
  max-width: 720px;
  margin: 48px auto;
  padding: 34px;
}

.setup-kicker {
  color: var(--color-green);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.setup h2 {
  margin: 7px 0 8px;
  font-size: clamp(28px, 4vw, 38px);
}

.setup-intro {
  max-width: 560px;
  margin-bottom: 24px;
  color: var(--color-text-soft);
  line-height: 1.6;
}

.player-input {
  display: grid;
  grid-template-columns: 34px 90px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface-soft);
}

.setup-player-number {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  background: var(--color-green);
  color: white;
  font-size: 12px;
  font-weight: 900;
}

.player-input label {
  font-size: 13px;
  font-weight: 800;
}

.player-input input {
  min-width: 0;
  padding: 11px 13px;
  border: 1px solid var(--color-border-strong);
  border-radius: 10px;
  background: white;
  color: var(--color-text);
  font: inherit;
}

.player-input input:focus {
  border-color: var(--color-green);
  outline: 3px solid rgb(26 122 86 / 12%);
}

.setup-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}

.secondary-button {
  background: var(--color-surface-soft);
  color: var(--color-green-dark);
}

.setup-error {
  color: #a72f38;
}

@media (max-width: 560px) {
  .setup {
    margin: 24px auto;
    padding: 22px 18px;
  }

  .player-input {
    grid-template-columns: 34px 1fr;
  }

  .player-input input,
  .player-input button {
    grid-column: 1 / -1;
  }

  .setup-actions {
    flex-direction: column-reverse;
  }
}
</style>
