<script>
  import AppIcon from "./AppIcon.svelte";
  let { icon, text } = $props();
</script>

<div class="toast"><AppIcon name={icon} size={14} />{text}</div>
