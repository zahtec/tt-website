import { redirect } from "@sveltejs/kit";

import { getProjects } from "$lib/prisma";

import type { PageServerLoad } from "./$types";

// Grab project data using slug, if the project doesn't exist, redirect to the projects page.
export const load: PageServerLoad<App.ProjectWithMetadata> = async ({
	params
}) => {
	return await getProjects({ url: params.project }).then((projects) => {
		if (!projects.length) throw redirect(302, "/projects");

		return projects[0];
	});
};
