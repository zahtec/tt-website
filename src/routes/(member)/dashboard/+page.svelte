<script lang="ts">
	import { getContext, onMount } from "svelte";

	import { user } from "$lib/stores";
	import { getIcon } from "$lib/getIcon";
	import DashHero from "./DashHero.svelte";
	import DashWrap from "./DashWrap.svelte";
	import DashLink from "./DashLink.svelte";
	import DashButton from "./DashButton.svelte";
	import Id from "$lib/icons/general/Id.svelte";
	import DashSection from "./DashSection.svelte";
	import Kudo from "$lib/components/Kudo.svelte";
	import Pin from "$lib/icons/general/Pin.svelte";
	import Bulb from "$lib/icons/general/Bulb.svelte";
	import Plus from "$lib/icons/general/Plus.svelte";
	import BadgeProgress from "./BadgeProgress.svelte";
	import DevTag from "$lib/components/DevTag.svelte";
	import Wrench from "$lib/icons/general/Wrench.svelte";
	import Pencil from "$lib/icons/general/Pencil.svelte";
	import TrendUp from "$lib/icons/general/TrendUp.svelte";
	import TenKudos from "$lib/icons/badges/TenKudos.svelte";
	import LinkIcon from "$lib/icons/general/LinkIcon.svelte";
	import ShowHide from "$lib/icons/general/ShowHide.svelte";
	import { PUBLIC_CLOUDFLARE_URL } from "$env/static/public";
	import DevSection from "$lib/components/DevSection.svelte";
	import Scrollable from "$lib/components/Scrollable.svelte";
	import ProjectEditPreview from "./ProjectEditPreview.svelte";
	import FiftyKudos from "$lib/icons/badges/FiftyKudos.svelte";
	import GradientText from "$lib/components/GradientText.svelte";
	import TenProjects from "$lib/icons/badges/TenProjects.svelte";
	import AllEndorsed from "$lib/icons/badges/AllEndorsed.svelte";
	import HundredKudos from "$lib/icons/badges/HundredKudos.svelte";
	import ExternalLink from "$lib/icons/general/ExternalLink.svelte";
	import TwentyProjects from "$lib/icons/badges/TwentyProjects.svelte";

	import type { PageData } from "./$types";
	import type { Writable } from "svelte/store";

	export let data: PageData;

	const timestamp = getContext("timestamp");
	const firstName = getContext<string[]>("name")[0];
	const tabindex = getContext<Writable<number>>("tabindex");

	// Get kudos counts from the last month, six months and twelve months for badges
	const [month, sixMonths, twelveMonths] = data.kudos.reduce(
		(
			result: [
				number,
				number,
				number,
				null | Date,
				null | Date,
				null | Date
			],
			kudo,
			i
		) => {
			// If it is the first iteration, assign the date variables for filtering
			if (!i) {
				const month = new Date();
				const sixMonths = new Date();
				const twelveMonths = new Date();

				month.setMonth(month.getMonth() - 1);
				sixMonths.setMonth(sixMonths.getMonth() - 6);
				twelveMonths.setMonth(twelveMonths.getMonth() - 12);

				result[3] = month;
				result[4] = sixMonths;
				result[5] = twelveMonths;
			}

			if (kudo.timestamp >= result[3]!) result[0]++;
			if (kudo.timestamp >= result[4]!) result[1]++;
			if (kudo.timestamp >= result[5]!) result[2]++;

			return result;
		},
		[0, 0, 0, null, null, null]
	);

	let visible = $user.visible;

	// Add functionality for pinning projects on the main dashboard
	let pinDebounce: NodeJS.Timeout;
	let pinnedProjectId = $user.pinnedProjectId;

	// Store badges parent element and the indices of the active badges for scroll progress effect
	let badges: HTMLDivElement;
	let playing = new Set<number>();

	// Create set to determine whether all of this user's skills are endorsed
	const endorsedCount = new Set(
		data.endorsementsReceived.map(
			(endorsement) => endorsement.softSkill || endorsement.techSkill
		)
	).size;

	// Create a count of projects that are visible
	const projectCount = data.projects.filter(
		(project) => project.visible
	).length;

	// Transform links into an array so it's easily iterable
	const links = Object.entries($user.links).reduce(
		(result: { key: string; link: string }[], [key, link]) =>
			link ? [{ key, link }, ...result] : result,
		[]
	);

	// Define the pinned project, the reason we don't use the user store for this is so that it stays
	// updated with the database and also because updating the user store causes a refresh on the projects page
	// that in turn re mounts it when on the main dashboard
	let pinnedProject = data.projects
		? data.projects.find((project) => project.id === pinnedProjectId)
		: null;

	// Update visibility of user
	const toggleVisible = () => {
		fetch("/api/user", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				id: $user.id,
				visible
			} as App.UserUpdateRequest)
		}).then(() => ($user.visible = visible));
	};

	// Debounce for pinned projects
	const togglePinned = () => {
		clearTimeout(pinDebounce);

		pinDebounce = setTimeout(() => {
			fetch("/api/user", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					id: $user.id,
					pinnedProjectId
				} as App.UserUpdateRequest)
			}).then(async () => {
				$user.pinnedProjectId = pinnedProjectId;

				// Find the project to update the user store
				const project = data.projects!.find(
					(project) => project.id === pinnedProjectId
				);

				if (!project)
					return ($user.pinnedProject = null), (pinnedProject = null);

				pinnedProject = project;

				// Take the authors property from the project since the store has it as a different type
				const { authors, ...pin } = project;

				$user.pinnedProject = pin;
			});
		}, 300);
	};

	onMount(() => {
		const observer: IntersectionObserver = new IntersectionObserver(
			(entries) =>
				playing.size === badges.children.length
					? observer.disconnect()
					: entries.forEach(
							(entry) =>
								entry.isIntersecting &&
								playing.add(
									Array.prototype.indexOf.call(
										badges.children,
										entry.target
									)
								) &&
								(playing = playing)
					  ),
			{ threshold: 0.9 }
		);

		// Get all badges as children and observe them for the scrolling animation
		for (const child of badges.children) {
			observer.observe(child);
		}

		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>Dashboard</title>
</svelte:head>

<DashWrap>
	<DashHero
		title="{(() => {
			const hour = new Date().getHours();

			if (hour < 12) return 'Good morning';
			if (hour < 17) return 'Good afternoon';
			return 'Good evening';
		})()}, {firstName}"
	/>

	<div class="flex flex-col gap-12">
		<DashSection
			title="Get Started"
			class="bg-gray-900 p-4 rounded-lg lg:flex lg:gap-8 lg:items-center"
		>
			<p class="mb-8 lg:mb-0 lg:max-w-sm lg:mx-auto">
				{#if $user.role === "User"}
					Top developers on the home page will be rotated every month,
					so to secure your spot, participate by learning new skills,
					creating projects, and helping out Team Tomorrow members
					around you. Your kudos and badges play a role in your
					ranking as well, so make sure to engage whenever you can and
					keep your profile up to date.
				{:else if $user.role === "Lead"}
					Empower other Team Tomorrow members by endorsing their
					skills and leading them in the right direction. To endorse a
					skill, simply go to the user's profile and use the plus
					button on whichever skill you wish. Your endorsements will
					be used to help employers find the right people for their
					projects, and serve as proof of Team Tomorrow's capability.
				{:else}
					Take control of the Team Tomorrow website by checking
					sitewide analytics to see what employers are most interested
					in, directly editing user profiles to ensure they are up to
					date, and by managing projects so they are never left in the
					dust. Like leads, you are also able to endorse skills, and
					serve proof of Team Tomorrow's capability.
				{/if}
			</p>

			<div class="flex flex-col gap-4 lg:w-1/2">
				{#if $user.role === "User"}
					<DashLink
						href="/dashboard/projects"
						class="bg-gray-700 flex gap-3 items-center justify-center hover:bg-gray-700/60"
					>
						<Plus class="w-4 h-4" />
						Create a New Project
					</DashLink>
				{:else if $user.role === "Lead"}
					<DashLink
						href="/developers"
						class="bg-gray-700 flex gap-3 items-center justify-center hover:bg-gray-700/60"
					>
						<Plus class="w-4 h-4" />
						Endorse a skill
					</DashLink>
				{:else}
					<DashLink
						href="/developers"
						class="bg-gray-700 flex gap-3 items-center justify-center hover:bg-gray-700/60"
					>
						<Plus class="w-4 h-4" />
						Manage All Projects
					</DashLink>
				{/if}

				{#if $user.role !== "Admin"}
					<DashLink
						href="/dashboard/profile"
						class="bg-gray-700 flex gap-3 items-center justify-center hover:bg-gray-700/60"
					>
						<Id class="w-5 h-5" />
						Update Your Profile
					</DashLink>
				{:else}
					<DashLink
						href="/dashboard/users"
						class="bg-gray-700 flex gap-3 items-center justify-center hover:bg-gray-700/60"
					>
						<Id class="w-5 h-5" />
						Manage All Users
					</DashLink>
				{/if}

				{#if $user.role !== "Admin"}
					<DashLink
						href="/dashboard/analytics"
						class="bg-gray-700 flex gap-3 items-center justify-center hover:bg-gray-700/60"
					>
						<TrendUp class="w-5 h-5" />
						Check Your Analytics
					</DashLink>
				{:else}
					<DashLink
						href="/dashboard/analytics"
						class="bg-gray-700 flex gap-3 items-center justify-center hover:bg-gray-700/60"
					>
						<TrendUp class="w-5 h-5" />
						Check Sitewide Analytics
					</DashLink>
				{/if}
			</div>
		</DashSection>

		<DashSection
			title="Your Profile"
			class="bg-gray-900 p-4 rounded-lg flex flex-col gap-8 lg:p-6 lg:gap-12"
		>
			<div class="lg:flex lg:gap-8">
				<div
					class="flex flex-col gap-2 items-center mb-6 md:gap-8 md:mt-4 md:items-start lg:w-1/2"
				>
					<div
						class="flex flex-col gap-6 w-full items-center md:flex-row"
					>
						<div class="relative mx-auto md:mx-0 md:shrink-0">
							<img
								height="512"
								width="512"
								src="{PUBLIC_CLOUDFLARE_URL}/avatar-{$user.id}/avatar?{timestamp}"
								alt="{$user.name}'s avatar"
								loading="lazy"
								class="rounded-full w-20 h-20 object-cover object-center bg-gray-400 lg:w-24 lg:h-24"
							/>

							<div
								class="absolute bg-gray-500 -bottom-2.5 -right-2.5 rounded-full p-2.5"
							>
								<svelte:component
									this={getIcon($user.team || "")}
									class="w-4 h-4"
								/>
							</div>
						</div>

						<div
							class="flex flex-col overflow-hidden w-full gap-1 justify-center items-center md:flex-col-reverse md:items-start"
						>
							<h1 class="font-semibold lg:-mt-1">
								{$user.team || "No Team"}
							</h1>

							<GradientText
								class="from-green-light to-green-dark text-3xl text-center md:text-start"
							>
								{$user.name}
							</GradientText>
						</div>
					</div>

					<p
						class="my-6 text-center break-words w-full md:text-lg md:text-start lg:my-0"
					>
						{$user.about}
					</p>
				</div>

				<div
					class="mt-4 w-full flex flex-col min-h-[15rem] lg:w-1/2 lg:min-h-[23.5rem] lg:overflow-hidden"
				>
					<div
						class="flex font-semibold justify-center items-center gap-3"
					>
						<Pin class="w-5 h-5" />
						<h1 class="text-lg">Pinned Project</h1>
					</div>

					{#if pinnedProject}
						<a
							target="_blank"
							href="/projects/{pinnedProject.url}"
							rel="noopener noreferrer"
							class="block rounded-lg border-t-4 overflow-hidden bg-gray-700 w-full mx-auto mt-4"
							style="border-color: #{pinnedProject.theme}"
							tabindex={$tabindex}
						>
							<img
								src="{PUBLIC_CLOUDFLARE_URL}/banner-{pinnedProject.id}/banner?{timestamp}"
								width="1920"
								height="1080"
								loading="lazy"
								alt="Banner for '{pinnedProject.title}'"
								class="object-cover object-center bg-gray-400 w-full h-32 md:h-20"
							/>

							<div class="flex flex-col py-4 px-3">
								<h1
									class="font-semibold break-words text-2xl md:text-xl"
								>
									{pinnedProject.title}
								</h1>

								<p class="mt-2 md:text-sm">
									{pinnedProject.description}
								</p>
							</div>
						</a>
					{:else}
						<div
							class="rounded-lg border-gray-700 border-4 border-dashed flex-1 mt-4"
						/>
					{/if}
				</div>
			</div>

			<div>
				<div class="flex flex-col gap-8 lg:flex-row">
					<DevSection title="Positions" class="lg:w-7/12">
						<Bulb slot="icon" class="w-5 h-5" />

						{#each { length: 4 } as _, i}
							<DevTag name={$user.positions[i]} lightBg={false} />
						{/each}
					</DevSection>

					<DevSection title="Top Skills" class="lg:w-6/12">
						<Wrench slot="icon" class="w-5 h-5" />

						{#each $user.techSkills as name (name)}
							<DevTag {name} lightBg={false} />
						{/each}

						{#each $user.softSkills as name (name)}
							<DevTag {name} lightBg={false} />
						{/each}

						<!-- Get the collective amount of techSkills and softSkills missing -->
						{#each { length: 10 - ($user.techSkills.length + $user.softSkills.length) } as _}
							<DevTag name="" lightBg={false} />
						{/each}
					</DevSection>
				</div>

				<div class="flex flex-col gap-8 mt-4 lg:flex-row">
					<DevSection
						title="Links"
						class="overflow-hidden lg:-mt-[12.5rem] lg:w-7/12"
					>
						<LinkIcon slot="icon" class="w-5 h-5" />

						{#each links as { link, key } (key)}
							<div
								class="flex justify-center items-center font-semibold bg-gray-700 rounded-lg gap-3 p-4"
							>
								<svelte:component
									this={getIcon(key)}
									class="w-6 h-6 shrink-0"
								/>

								<h1
									class="text-sm overflow-auto scrollbar-hidden"
								>
									{link}
								</h1>
							</div>
						{/each}

						<!-- Get the collective amount of links missing -->
						{#each { length: 6 - links.length } as _}
							<DevTag name="" lightBg={false} />
						{/each}
					</DevSection>

					<div
						class="flex items-end gap-4 ml-auto lg:w-6/12 lg:justify-end"
					>
						<DashLink
							icon={true}
							href="/developers/{data.url}"
							target="_blank"
							class="bg-gray-700 hover:bg-gray-700/60"
						>
							<ExternalLink class="w-4 h-4" />
						</DashLink>

						<DashButton
							icon={true}
							on:click={() => (visible = !visible)}
							debounce={{
								bind: visible,
								func: toggleVisible,
								delay: 300
							}}
							class="bg-gray-700 hover:bg-gray-700/60"
						>
							<ShowHide class="w-4 h-4" crossed={!visible} />
						</DashButton>

						<DashLink
							icon={true}
							href="/dashboard/profile"
							class="bg-blue-light hover:bg-blue-light/60"
						>
							<Pencil class="w-4 h-4" />
						</DashLink>
					</div>
				</div>
			</div>
		</DashSection>

		<div class="flex flex-col gap-5">
			<h1 class="font-semibold text-2xl text-center">Your Badges</h1>
			<div
				bind:this={badges}
				class="h-full bg-gray-900 p-4 rounded-lg flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:grid-flow-row-dense"
			>
				<BadgeProgress
					name="Project Starter"
					playing={playing.has(0)}
					progress={projectCount / 10}
					class="bg-blue-light"
				>
					<TenProjects slot="badge" />

					Create 10 projects that aren't hidden
				</BadgeProgress>

				<BadgeProgress
					name="Project Master"
					playing={playing.has(1)}
					progress={projectCount / 20}
					class="bg-pink-light"
				>
					<TwentyProjects slot="badge" />

					Create 20 projects that aren't hidden
				</BadgeProgress>

				<BadgeProgress
					name="All Endorsed"
					playing={playing.has(2)}
					progress={endorsedCount / 10}
					class="bg-purple-light"
				>
					<AllEndorsed slot="badge" />

					Have the max of 10 skills all endorsed
				</BadgeProgress>

				<BadgeProgress
					name="Kudo Starter"
					playing={playing.has(3)}
					progress={month / 10}
					class="bg-red-light"
				>
					<TenKudos slot="badge" />

					Get 10 kudos in the last month
				</BadgeProgress>

				<BadgeProgress
					name="Kudo Master"
					playing={playing.has(4)}
					progress={sixMonths / 50}
					class="bg-teal-light"
				>
					<FiftyKudos slot="badge" />

					Get 50 kudos in the last six months
				</BadgeProgress>

				<BadgeProgress
					name="Kudo Legend"
					playing={playing.has(5)}
					progress={twelveMonths / 100}
					class="bg-green-light"
				>
					<HundredKudos slot="badge" />

					Get 100 kudos in the last 12 months
				</BadgeProgress>
			</div>
		</div>

		<DashSection title="Your Projects" class="bg-gray-900 rounded-lg p-4">
			<div
				class="min-h-[58rem] flex flex-col gap-8 xl:grid xl:grid-cols-2 xl:min-h-0"
			>
				{#each { length: 2 } as _, i}
					{@const project = data.projects[i]}

					{#if project}
						<ProjectEditPreview
							bind:pinnedProject={pinnedProjectId}
							{project}
							minified={true}
							on:pinned={togglePinned}
						/>
					{:else}
						<div
							class="rounded-lg border-gray-700 border-4 min-h-112 border-dashed flex-1 h-full"
						/>
					{/if}
				{/each}
			</div>

			<DashLink
				href="/dashboard/projects"
				class="bg-gray-700 hover:bg-gray-700/60 w-full mx-auto mt-4 lg:mt-8 lg:w-fit lg:mr-0"
			>
				Manage All Projects
			</DashLink>
		</DashSection>

		<DashSection title="Your Kudos" class="bg-gray-900 rounded-lg p-4">
			<Scrollable
				vertical={true}
				class="before:from-gray-900 after:to-gray-900 h-120 md:h-[29rem]"
				innerClass="gap-10 scrollbar-hidden {data.kudos.length
					? 'pt-4'
					: 'lg:pt-8'}"
			>
				{#each data.kudos.slice(0, 10) as kudo (kudo)}
					<Kudo {kudo} />
				{:else}
					<h1 class="text-center font-semibold text-xl pt-1 m-auto">
						No Kudos
					</h1>
				{/each}
			</Scrollable>

			<DashLink
				href="/dashboard/kudos"
				class="bg-gray-700 hover:bg-gray-700/60 w-full mx-auto mt-4 lg:mt-6 lg:w-fit lg:mr-0"
			>
				All Kudos
			</DashLink>
		</DashSection>
	</div>
</DashWrap>
