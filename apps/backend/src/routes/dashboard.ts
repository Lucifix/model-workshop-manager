import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  models,
  projects,
  paints,
  paintInventory,
  supplies,
  ownedModels,
  buildLogEntries,
} from "../db/schema.js";

const SUPPLY_LOW_STOCK_THRESHOLD = 1;

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", async () => {
    const allModels = db.select().from(models).all();
    const allProjects = db.select().from(projects).all();
    const allPaints = db.select().from(paints).all();
    const allPaintInventory = db.select().from(paintInventory).all();
    const allSupplies = db.select().from(supplies).all();
    const allOwnedModels = db.select().from(ownedModels).all();

    const inProgress = allProjects.filter((p) => p.status === "In Progress");
    const completed = allProjects.filter((p) => p.status === "Completed");
    const planned = allProjects.filter((p) => p.status === "Planned");
    const lowStock = allPaintInventory.filter(
      (p) => p.fillLevel === "Low" || p.fillLevel === "Empty",
    );
    const lowStockSupplies = allSupplies.filter((s) => s.quantity <= SUPPLY_LOW_STOCK_THRESHOLD);

    const totalStashValue =
      allOwnedModels.reduce((sum, m) => sum + (m.purchasePrice ?? 0) * m.quantity, 0) +
      allPaintInventory.reduce((sum, p) => sum + (p.purchasePrice ?? 0) * p.quantity, 0) +
      allSupplies.reduce((sum, s) => sum + (s.purchasePrice ?? 0) * s.quantity, 0);

    const recentLog = db
      .select({ log: buildLogEntries, project: projects })
      .from(buildLogEntries)
      .leftJoin(projects, eq(buildLogEntries.projectId, projects.id))
      .all()
      .toSorted((a, b) => b.log.createdAt.localeCompare(a.log.createdAt))
      .slice(0, 10);

    const recentModels = allModels
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);

    const recentlyCompleted = completed
      .toSorted((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 5);

    return {
      totalModelKits: allModels.length,
      inProgressCount: inProgress.length,
      completedCount: completed.length,
      plannedCount: planned.length,
      totalPaints: allPaints.length,
      lowStockCount: lowStock.length,
      totalSupplies: allSupplies.length,
      lowStockSuppliesCount: lowStockSupplies.length,
      totalStashValue,
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
