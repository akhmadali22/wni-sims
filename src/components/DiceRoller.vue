<script setup lang="ts">
const props = defineProps<{
  dice: [number, number] | null;
  disabled: boolean;
  rolling?: boolean;
}>();

defineEmits<{
  roll: [];
}>();

const pipPositions: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

function hasPip(value: number | undefined, position: number) {
  return value ? pipPositions[value]?.includes(position) : false;
}
</script>

<template>
  <section class="panel dice-panel">
    <header class="panel-heading">
      <div>
        <span class="panel-kicker">Aksi giliran</span>
        <h2>Lempar Dadu</h2>
      </div>
    </header>

    <div class="dice-display">
      <div
        v-for="(value, dieIndex) in (dice ?? [undefined, undefined])"
        :key="dieIndex"
        class="die"
        :class="{ 'die--rolling': props.rolling }"
        :aria-label="value ? `Dadu ${value}` : 'Dadu belum dilempar'"
      >
        <span v-if="!value" class="die-placeholder">?</span>
        <span
          v-for="position in 9"
          v-else
          :key="position"
          class="pip-cell"
        >
          <i v-if="hasPip(value, position)" class="pip" />
        </span>
      </div>
    </div>

    <button
      class="roll-button"
      type="button"
      :disabled="disabled"
      @click="$emit('roll')"
    >
      {{ props.rolling ? "Pion bergerak…" : "Lempar Dadu" }}
    </button>
  </section>
</template>
