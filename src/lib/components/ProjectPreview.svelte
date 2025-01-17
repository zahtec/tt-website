<script lang="ts">
	import { getContext } from "svelte";
	import { fly } from "svelte/transition";

	import { getIcon } from "$lib/getIcon";
	import { PUBLIC_CLOUDFLARE_URL } from "$env/static/public";

	import type { Writable } from "svelte/store";

	// Provide a special view for profile pages where the author user is hidden from the preview
	// if they're the only author, also the fly transition is disabled for the project search
	export let userId: string | null = null;

	export let lightBg = true;
	export let project: App.ProjectWithMetadata;

	const timestamp = getContext("timestamp") as string;
	const tabindex = getContext<Writable<number>>("tabindex");
</script>

<a
	on:click
	in:fly={{ duration: userId ? 0 : 300, y: 30 }}
	href="/projects/{project.url}"
	rel="noreferrer noopener"
	class:bg-gray-700={lightBg}
	class:bg-gray-900={!lightBg}
	class="rounded-lg border-t-4 overflow-hidden w-full block shrink-0"
	style="border-color: #{project.theme}"
	tabindex={$tabindex}
>
	<div class="relative">
		<img
			src="{PUBLIC_CLOUDFLARE_URL}/banner-{project.id}/banner?{timestamp}"
			width="1920"
			height="1080"
			loading="lazy"
			alt="Banner for '{project.title}'"
			class="object-cover object-center bg-gray-400 w-full h-32"
		/>

		<div
			class="absolute flex w-full justify-end items-center top-2 right-1 pr-6 sm:pr-8"
		>
			{#each project.authors.slice(0, 5) as { user }, i (user.id)}
				{#if project.authors.length === 1 && !(userId && user.id === userId)}
					<img
						width="512"
						height="512"
						src="{PUBLIC_CLOUDFLARE_URL}/avatar-{user.id}/avatar?{timestamp}"
						alt="{user.name}'s avatar"
						class="w-10 h-10 bg-gray-400 object-cover object-center shrink-0 -mr-5 rounded-full border-2 sm:-mr-7 sm:w-12 sm:h-12 sm:border-4 md:w-14 md:h-14"
						style="border-color: #{project.theme}; z-index: {project
							.authors.length - i}"
					/>
				{/if}
			{/each}
		</div>
	</div>

	<div class="flex flex-col py-4 px-3 min-h-116">
		<h1 class="font-semibold text-2xl break-words">{project.title}</h1>

		<p class="mt-2">{project.description}</p>

		<div class="flex gap-3 mt-auto pt-4">
			{#each project.skills as skill (skill)}
				<svelte:component this={getIcon(skill)} class="w-8 h-8" />
			{/each}
		</div>
	</div>
</a>
