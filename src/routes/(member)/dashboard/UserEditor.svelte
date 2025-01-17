<script lang="ts">
	import { getContext } from "svelte";
	import { slide } from "svelte/transition";

	import Input from "./Input.svelte";
	import TextBox from "./TextBox.svelte";
	import { user as login } from "$lib/stores";
	import DashButton from "./DashButton.svelte";
	import Id from "$lib/icons/general/Id.svelte";
	import Devto from "$lib/icons/logos/Devto.svelte";
	import Group from "$lib/icons/general/Group.svelte";
	import GitHub from "$lib/icons/logos/GitHub.svelte";
	import Pencil from "$lib/icons/general/Pencil.svelte";
	import Twitter from "$lib/icons/logos/Twitter.svelte";
	import Dropdown from "$lib/components/Dropdown.svelte";
	import LinkedIn from "$lib/icons/logos/LinkedIn.svelte";
	import Facebook from "$lib/icons/logos/Facebook.svelte";
	import LinkIcon from "$lib/icons/general/LinkIcon.svelte";
	import ShowHide from "$lib/icons/general/ShowHide.svelte";
	import { PUBLIC_CLOUDFLARE_URL } from "$env/static/public";
	import GradientText from "$lib/components/GradientText.svelte";
	import ProfileSection from "$lib/components/ProfileSection.svelte";
	import ExternalLink from "$lib/icons/general/ExternalLink.svelte";
	import {
		teams,
		positions,
		softSkills,
		techSkills,
		roles
	} from "$lib/enums";

	import type { Writable } from "svelte/store";
	import type {
		Position,
		SoftSkill,
		TechSkill,
		Team,
		Role
	} from "@prisma/client";

	export let original: Writable<App.UserWithMetadata>;

	const tabindex = getContext<Writable<number>>("tabindex");

	let user = {
		...$original,
		positions: [...$original.positions],
		softSkills: [...$original.softSkills],
		techSkills: [...$original.techSkills],
		links: Object.assign({}, $original.links)
	};

	// Store the keys of the links so that they can be iterated over for comparison and updating
	const linkKeys = Object.keys(user.links) as (keyof App.UserLinks)[];

	let nameError = false;
	let disableForm = false;
	let disableButtons = true;
	let visible = $original.visible;

	// Image and banner input elements for when the user switches their profile picture
	let banner: HTMLInputElement;
	let avatar: HTMLInputElement;

	const checkConstraints = () => {
		// If the form is disabled ignore since the reactive statements fire due to the fetch call
		if (disableForm) return;

		disableButtons = true;

		const name = user.name?.trim();
		const about = user.about.trim();

		if (
			!name ||
			name.length < 1 ||
			name.length > 25 ||
			about.length > 150 ||
			user.positions.length < 2 ||
			user.softSkills.length < 2 ||
			user.techSkills.length < 2
		)
			return;

		// Check if the data has changed from its original content
		if (
			$original.role === user.role &&
			$original.name === user.name &&
			$original.about === user.about &&
			$original.team === user.team &&
			$original.positions.length === user.positions.length &&
			$original.positions.every(
				(position, i) => user.positions[i] === position
			) &&
			$original.softSkills.length === user.softSkills.length &&
			$original.softSkills.every(
				(softSkill, i) => user.softSkills[i] === softSkill
			) &&
			$original.techSkills.length === user.techSkills.length &&
			$original.techSkills.every(
				(techSkill, i) => user.techSkills[i] === techSkill
			) &&
			linkKeys.every((link) => $original.links[link] === user.links[link])
		)
			return;

		disableButtons = false;
	};

	// For updating dropdown arrays
	const dropdownUpdate = <T extends Position | SoftSkill | TechSkill>(
		array: T[],
		selected: string | undefined,
		previous: string | undefined
	) => {
		const index = array.indexOf(previous as T);

		// If the newly selected value is the same ignore
		if (array[index] === selected) return;

		// If there is a found value for that dropdown, and a selected value then update it, otherwise delete it.
		// If there isn't a found value for that dropdown then push it to the array.
		if (index !== -1) {
			selected ? (array[index] = selected as T) : array.splice(index, 1);
		} else if (selected) array.push(selected as T);

		checkConstraints();
	};

	const updateTeam = ({
		detail
	}: CustomEvent<{
		selected: string | undefined;
		previous: string | undefined;
	}>) => (user.team = detail.selected as Team) && checkConstraints();

	const updateRole = ({
		detail
	}: CustomEvent<{
		selected: string | undefined;
		previous: string | undefined;
	}>) => (user.role = detail.selected as Role) && checkConstraints();

	$: {
		if (user.name && user.name !== $original.name) {
			nameError = false;
			user.name = user.name.replaceAll(/[^a-zA-Z\s-]/g, "");
		}

		checkConstraints();
	}

	// On cancel, revert the values to their originals and disable the save/cancel buttons
	const cancel = () => {
		disableButtons = true;
		user = JSON.parse(JSON.stringify($original));
	};

	const save = () => {
		checkConstraints();

		if (disableButtons || disableForm) return;

		// Store the user on save so that if it changes while being saved the buttons are re-enabled
		const savedUser = JSON.parse(JSON.stringify(user));

		disableForm = true;

		// Generate the proper url for the user based off of their name and also trim
		// their name and about sections
		user.name = user.name.trim();
		user.url = user.name.trim().toLowerCase().replaceAll(/\s+/g, "-");
		user.about = user.about.trim();

		disableButtons = true;

		fetch("/api/user", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				...savedUser
			} as App.UserUpdateRequest)
		}).then((res) => {
			// If the status is 205, it is most likely a name that already exists
			if (res.status === 205)
				return (
					(disableButtons = true) &&
					(nameError = true) &&
					(disableForm = false)
				);

			// If successful, update the original data store
			original.set(savedUser);

			disableForm = false;

			checkConstraints();
		});
	};

	// Update profile picture/banner of user
	const updateImage = async (type: "banner" | "avatar") => {
		const body = new FormData();

		// Append the newly uploaded image to the body
		body.append(
			"file",
			new File(
				[type === "banner" ? banner.files![0] : avatar.files![0]],
				type
			)
		);

		// Apend the type and user id
		body.append("id", user.id);
		body.append("type", `user-${type}`);

		// Update the image
		await fetch("/api/images", {
			method: "PATCH",
			body
		}).catch(() => {}); // Ignore errors, the avatar will just stay the same

		// Reset the selected input value and enabled it
		if (type === "banner") banner.disabled = false;
		else avatar.disabled = false;

		avatar.value = "";

		// Reassigned the user object to trigger a layout re-render
		$original = $original;
	};

	// Update visility of user
	const toggleVisible = () => {
		fetch("/api/user", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				id: user.id,
				visible
			} as App.UserUpdateRequest)
		}).then(() => ($original.visible = visible));
	};

	// When the user does CTRL/CMD + S, save the data
	const onKeydown = (e: KeyboardEvent) => {
		if ((e.metaKey && e.key === "s") || (e.ctrlKey && e.key === "s")) {
			e.preventDefault();
			save();
		}
	};
</script>

<svelte:head>
	<title>Profile Manager</title>
</svelte:head>

<svelte:window on:keydown={onKeydown} />

<div class="relative pt-18 px-5 lg:px-6">
	<label class="grid absolute top-0 inset-x-0 z-20 cursor-pointer">
		{#if banner && banner.disabled}
			<div
				class="animate-grays from-gray-400 to-gray-700 w-full h-32 row-start-1 col-start-1 lg:h-44"
			/>
		{:else}
			<img
				src="{PUBLIC_CLOUDFLARE_URL}/banner-{$original.id}/banner?{new Date().getTime()}"
				width="1920"
				height="1080"
				alt="{$original.name}'s banner"
				class="object-cover object-center bg-gray-400 w-full h-32 row-start-1 col-start-1 lg:h-44"
			/>
		{/if}

		<div
			class="w-full h-full bg-black/40 flex justify-center items-center gap-2 row-start-1 col-start-1"
		>
			<Pencil class="w-5 h-5" />
			<h1 class="text-xl select-none font-semibold lg:text-2xl">Edit</h1>
		</div>

		<input
			bind:this={banner}
			on:change={() =>
				banner.files?.length &&
				// Limit file size to 2MB
				banner.files[0].size <= 2000000 &&
				(banner.disabled = true) &&
				updateImage("banner")}
			type="file"
			accept=".png, .jpg, .jpeg, .webp, .avif"
			class="opacity-0 w-0 h-0"
			alt="Upload a banner"
			tabindex={$tabindex}
		/>
	</label>

	<div class="z-10 lg:flex lg:gap-8 lg:justify-center">
		<div
			class="flex flex-col z-30 gap-4 lg:shrink-0 lg:sticky lg:h-min lg:mt-10 lg:top-2 lg:w-60"
		>
			<label
				class="rounded-full z-30 cursor-pointer w-fit border-4 mt-4 border-black mx-auto grid lg:mx-0"
			>
				{#if avatar && avatar.disabled}
					<div
						class="animate-grays from-gray-400 to-gray-700 w-28 h-28 rounded-full row-start-1 col-start-1 lg:w-32 lg:h-32"
					/>
				{:else}
					<img
						width="512"
						height="512"
						src="{PUBLIC_CLOUDFLARE_URL}/avatar-{$original.id}/avatar?{new Date().getTime()}"
						alt="{$original.name}'s avatar"
						class="w-28 h-28 bg-gray-400 object-cover object-center rounded-full row-start-1 col-start-1 lg:w-32 lg:h-32"
					/>

					<div
						class="bg-black/40 rounded-full flex row-start-1 col-start-1 z-10"
					>
						<Pencil class="w-6 h-6 m-auto" />
					</div>
				{/if}

				<input
					bind:this={avatar}
					on:change={() =>
						avatar.files?.length &&
						// Limit file size to 2MB
						avatar.files[0].size <= 2000000 &&
						(avatar.disabled = true) &&
						updateImage("avatar")}
					type="file"
					accept=".png, .jpg, .jpeg, .webp, .avif"
					class="opacity-0 w-0 h-0"
					alt="Upload a banner"
					tabindex={$tabindex}
				/>
			</label>

			<GradientText
				class="from-green-light to-green-dark font-bold text-3xl text-center lg:text-start"
			>
				{$original.name}
			</GradientText>

			<div class="flex justify-center gap-4 w-full mx-auto lg:mx-0">
				<a
					target="_blank"
					rel="noopener noreferrer"
					href="/developers/{$original.url}"
					class="px-4 py-3 rounded-lg bg-gray-900 text-lg flex items-center justify-center max-w-xs gap-4 w-full transition-colors hover:bg-gray-900/60"
					tabindex={$tabindex}
				>
					View Profile
					<ExternalLink class="w-4 h-4 mt-0.5" />
				</a>

				<DashButton
					icon={true}
					on:click={() => (visible = !visible)}
					debounce={{
						bind: visible,
						func: toggleVisible,
						delay: 300
					}}
					class="bg-gray-900 hover:bg-gray-900/60"
				>
					<ShowHide class="w-5 h-5" crossed={!visible} />
				</DashButton>
			</div>
		</div>

		<div
			class:opacity-60={disableForm}
			class:pointer-events-none={disableForm}
			class="transition-opacity duration-300 3xl:w-full 3xl:max-w-5xl"
			aria-disabled={disableForm}
		>
			<div
				class="flex flex-col mt-8 gap-12 max-w-xl mx-auto lg:text-sm lg:max-w-screen-2xl lg:mt-40 lg:mx-0 3xl:flex-row 3xl:items-stretch 3xl:text-sm 3xl:max-w-none"
			>
				<div class="flex flex-col gap-12 justify-between 3xl:w-1/2">
					<ProfileSection title="About Me">
						{#if $login.role === "Admin" && $login.id !== $original.id && $original.role !== "Admin"}
							<Dropdown
								options={roles}
								required={true}
								groupSelected={[user.role]}
								on:change={updateRole}
							/>
						{/if}

						<div>
							<div
								class="flex rounded-lg select-none bg-gray-700"
							>
								<div class="rounded-l-lg w-14 p-4 bg-gray-500">
									<Id class="w-5 h-5 mx-auto" />
								</div>
								<input
									bind:value={user.name}
									type="text"
									class="w-full h-full px-2 py-4 bg-transparent focus:outline-none my-auto"
									placeholder="Your name"
									maxlength={25}
									tabindex={$tabindex}
									aria-errormessage="title-error"
								/>
							</div>

							{#if nameError}
								<p
									transition:slide
									id="title-error"
									class="text-red-light text-center font-semibold text-sm mt-2"
								>
									Name already in use!
								</p>
							{/if}
						</div>

						<TextBox
							bind:value={user.about}
							placeholder="Include previous projects, skills, and your experience level..."
							max={150}
						/>

						<Dropdown
							options={teams}
							required={false}
							groupSelected={[user.team]}
							on:change={updateTeam}
						>
							<Group class="w-6 h-6 shrink-0" />
						</Dropdown>
					</ProfileSection>

					<ProfileSection title="Links" largeGrid={true}>
						<Input
							bind:value={user.links.GitHub}
							placeholder="GitHub username"
						>
							<GitHub class="w-5 h-5 mx-auto" />
						</Input>

						<Input
							bind:value={user.links.LinkedIn}
							placeholder="LinkedIn username"
						>
							<LinkedIn class="w-5 h-5 mx-auto" />
						</Input>

						<Input
							bind:value={user.links.Devto}
							placeholder="Dev.to username"
						>
							<Devto class="w-5 h-5 mx-auto" />
						</Input>

						<Input
							bind:value={user.links.Twitter}
							placeholder="Twitter username"
						>
							<Twitter class="w-5 h-5 mx-auto" />
						</Input>

						<Input
							bind:value={user.links.Facebook}
							placeholder="Facebook username"
						>
							<Facebook class="w-5 h-5 mx-auto" />
						</Input>

						<Input
							bind:value={user.links.Website}
							placeholder="Website link"
						>
							<LinkIcon class="w-5 h-5 mx-auto" />
						</Input>
					</ProfileSection>
				</div>

				<div class="flex flex-col gap-12 justify-between 3xl:w-[56%]">
					<ProfileSection title="Positions" largeGrid={true}>
						{#each { length: 4 } as _, i}
							<Dropdown
								{i}
								required={i < 2}
								options={positions}
								groupSelected={user.positions}
								on:change={({ detail }) => {
									dropdownUpdate(
										user.positions,
										detail.selected,
										detail.previous
									);
									user.positions = user.positions;
								}}
							/>
						{/each}
					</ProfileSection>

					<ProfileSection title="Top Skills" largeGrid={true}>
						<div class="flex flex-col gap-6">
							<h1 class="font-semibold text-xl text-center">
								Soft
							</h1>
							{#each { length: 5 } as _, i}
								<Dropdown
									{i}
									required={i < 2}
									options={softSkills}
									groupSelected={user.softSkills}
									on:change={({ detail }) => {
										dropdownUpdate(
											user.softSkills,
											detail.selected,
											detail.previous
										);
										user.softSkills = user.softSkills;
									}}
								/>
							{/each}
						</div>

						<div class="flex flex-col gap-6">
							<h1 class="font-semibold text-xl text-center">
								Technical
							</h1>
							{#each { length: 5 } as _, i}
								<Dropdown
									{i}
									required={i < 2}
									options={techSkills}
									groupSelected={user.techSkills}
									on:change={({ detail }) => {
										dropdownUpdate(
											user.techSkills,
											detail.selected,
											detail.previous
										);
										user.techSkills = user.techSkills;
									}}
								/>
							{/each}
						</div>
					</ProfileSection>
				</div>
			</div>

			<div class="flex gap-6 justify-center mt-8 mb-32 3xl:justify-end">
				<DashButton
					on:click={cancel}
					disabled={disableButtons}
					class="bg-gray-900 hover:bg-gray-900/60 disabled:hover:bg-gray-900"
				>
					Cancel
				</DashButton>

				<DashButton
					on:click={save}
					disabled={disableButtons}
					class="bg-blue-light hover:bg-blue-light/60 disabled:hover:bg-gray-900"
				>
					Save
				</DashButton>
			</div>
		</div>
	</div>
</div>
