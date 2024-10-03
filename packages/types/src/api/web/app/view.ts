import { z } from "zod"
import { ViewV2 } from "../../../documents"
import { ViewV2Enriched } from "../../../sdk/view"

export interface ViewResponse {
  data: ViewV2
}

export interface ViewResponseEnriched {
  data: ViewV2Enriched
}

// export interface CreateViewRequest extends Omit<ViewV2, "version" | "id"> {}

const view = z.object({
  name: z.string(),
  tableId: z.string(),
  query: z.any(),
  sort: z.any(),
  primaryDisplay: z.string(),
})

export type CreateViewRequest = z.infer<typeof view>

export interface UpdateViewRequest extends ViewV2 {}
