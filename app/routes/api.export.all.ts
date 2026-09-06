import { db } from "../db/client.server";
import { manufacturers, paints, models, modelPaints } from "../db/schema";

export async function loader() {
  return Response.json({
    manufacturers: db.select().from(manufacturers).all(),
    paints: db.select().from(paints).all(),
    models: db.select().from(models).all(),
    modelPaints: db.select().from(modelPaints).all(),
  });
}
