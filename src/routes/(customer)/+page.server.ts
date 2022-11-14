import { getProjects, prisma } from "$lib/prisma";

import type { PageServerLoad } from "./$types";

// Grab the author data and descriptions for the 4 selected projects on the landing page as well as
// the user data for the 3 selected developers
export const load: PageServerLoad<{
	projects: App.ProjectWithMetadata[];
	developers: App.Developer[];
}> = async () => {
	const projects = await getProjects({
		url: {
			in: [
				"hippo2",
				"ai-camp-bot",
				"team-tomorrow-website",
				"ai-on-thumbs"
			]
		}
	});

	// TODO: Add top 3 developer's Discord ids to the database and use them here
	const developers = await prisma.user.findMany({
		where: {
			homepage: true
		},
		select: {
			name: true,
			team: true,
			id: true,
			about: true,
			softSkills: true,
			techSkills: true
		}
	});

	return { projects, developers };
};
