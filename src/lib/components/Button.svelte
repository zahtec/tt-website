<script lang="ts">
	import { getContext } from "svelte";

	import type { Writable } from "svelte/store";

	let className = "";
	export let href: string;

	export { className as class };

	const tabindex = getContext<Writable<number>>("tabindex");
</script>

<a
	on:click
	{href}
	tabindex={$tabindex}
	class="block mx-auto text-lg bg-white text-black px-6 py-2 rounded-lg text-center w-fit transition-border hover:rounded-4xl {className}"
	rel="noopener noreferrer"
>
	<slot />
</a>
