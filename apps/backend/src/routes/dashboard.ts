import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  models,
  projects,
  paints,
  paintInventory,
  buildLogEntries,
} from "../db/schema.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", async () => {
    const allModels = db.select().from(models).all();
    const allProjects = db.select().from(projects).all();
    const allPaints = db.select().from(paints).all();
    const allPaintInventory = db.select().from(paintInventory).all();

    const inProgress = allProjects.filter((p) => p.status === "In Progress");
    const completed = allProjects.filter((p) => p.status === "Completed");
    const planned = allProjects.filter((p) => p.status === "Planned");
    const lowStock = allPaintInventory.filter(
      (p) => p.fillLevel === "Low" || p.fillLevel === "Empty",
    );

    const recentLog = db
      .select({ log: buildLogEntries, project: projects })
      .from(buildLogEntries)
      .leftJoin(projects, eq(buildLogEntries.projectId, projects.id))
      .all()
      .sort((a, b) => b.log.createdAt.localeCompare(a.log.createdAt))
      .slice(0, 10);

    const recentModels = [...allModels]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);

    const recentlyCompleted = [...completed]
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 5);

    return {
      totalModelKits: allModels.length,
      inProgressCount: inProgress.length,
      completedCount: completed.length,
      plannedCount: planned.length,
      totalPaints: allPaints.length,
      lowStockCount: lowStock.length,
      recentActivity: recentLog.map((r) => ({
        projectName: r.project?.name,
        title: r.log.title,
        createdAt: r.log.createdAt,
      })),
      recentlyAddedModels: recentModels,
      recentlyCompletedBuilds: recentlyCompleted,
    };
  });
}
