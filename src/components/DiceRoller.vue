<script setup lang="ts">
defineProps<{
  dice: [number, number] | null;
  disabled: boolean;
}>();

defineEmits<{
  roll: [];
}>();
</script>

<template>
  <section class="panel">
    <h2>Dadu</h2>

    <div class="dice-display">
      <span>{{ dice?.[0] ?? "?" }}</span>
      <span>{{ dice?.[1] ?? "?" }}</span>
    </div>

    <button
      type="button"
      :disabled="disabled"
      @click="$emit('roll')"
    >
      Lempar Dadu
    </button>
  </section>
</template>
