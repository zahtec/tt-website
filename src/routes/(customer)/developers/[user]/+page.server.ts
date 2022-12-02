import { redirect } from "@sveltejs/kit";
import { getProjects } from "$lib/prisma";
import { getKudos, prisma } from "$lib/prisma";

import type { PageServerLoad } from "./$types";
import type { User, Endorsement } from "@prisma/client";

// Grab project data using slug, if the project doesn't exist, redirect to the projects page.
// The reason the typing on this is so weird is because we are selecting only specific properties of each
// object and there isn't an easy way to type it
export const load: PageServerLoad<{
	userPage: User & {
		links: App.UserLinks;
		pinnedProject?: App.ProjectWithMetadata;
		endorsementsReceived: (Endorsement & {
			from: Pick<User, "id" | "name" | "url">;
		})[];
	};
	projects: App.ProjectWithMetadata[];
	kudos: App.Kudo[];
}> = async ({ params }) => {
	const userPage = (await prisma.user.findUnique({
		where: { url: params.user },
		include: {
			links: {
				select: {
					userId: false,
					Devto: true,
					Facebook: true,
					GitHub: true,
					LinkedIn: true,
					Twitter: true,
					Website: true
				}
			},
			pinnedProject: {
				include: {
					authors: {
						select: {
							position: true,
							user: true
						}
					}
				}
			},
			endorsementsReceived: {
				include: {
					from: {
						select: {
							id: true,
							name: true,
							url: true
						}
					}
				}
			}
		}
	})) as User & {
		links: App.UserLinks;
		pinnedProject?: App.ProjectWithMetadata;
		endorsementsReceived: (Endorsement & {
			from: Pick<User, "id" | "name" | "url">;
		})[];
	};

	if (!userPage) throw redirect(302, "/developers");

	const projects = await getProjects({
		OR: [
			{
				ownerId: userPage.id
			},
			{
				authors: {
					some: {
						userId: userPage.id
					}
				}
			}
		],
		visible: true
	});

	return {
		userPage,
		projects,
		kudos: await getKudos(userPage.id)
	};
};