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
    <h2 id="setup-title">Siapkan Permainan</h2>
    <p>
      Pilih {{ MIN_PLAYERS }}–{{ MAX_PLAYERS }} pemain. Setiap pemain
      memulai dengan Rp{{ DEFAULT_INITIAL_CASH.toLocaleString("id-ID") }}.
    </p>

    <form @submit.prevent="submit">
      <div
        v-for="(_, index) in playerNames"
        :key="index"
        class="player-input"
      >
        <label :for="`player-name-${index}`">
          Pemain {{ index + 1 }}
        </label>
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
  max-width: 680px;
  margin: 24px auto;
}

.player-input {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  margin-top: 12px;
}

.player-input input {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #bdcec2;
  border-radius: 8px;
}

.setup-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}

.secondary-button {
  background: #e9f0eb;
  color: #26352c;
}

.setup-error {
  color: #a72f38;
}

@media (max-width: 560px) {
  .player-input {
    grid-template-columns: 1fr;
  }
}
</style>
