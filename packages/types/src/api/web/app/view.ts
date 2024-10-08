import { z } from "zod"
import { ViewV2, viewV2Schema } from "../../../documents"
import { ViewV2Enriched } from "../../../sdk/view"
import { EmptyFilterOption, FilterGroupLogicalOperator } from "../../../sdk"

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
  primaryDisplay: z.string().optional(),
  query: z.any(),
  sort: z.any(),
  schema: viewV2Schema.optional(),
  queryUI: z
    .object({
      logicalOperator: z.nativeEnum(FilterGroupLogicalOperator),
      onEmptyFilter: z.nativeEnum(EmptyFilterOption).optional(),
      groups: z.any().optional(),
      filters: z.any().optional(),
    })
    .optional(),
})

export const createViewRequest = view
export const updateViewRequest = view.extend({
  id: z.string(),
  version: z.literal(2),
})

export type CreateViewRequest = z.infer<typeof createViewRequest>

export type UpdateViewRequest = z.infer<typeof updateViewRequest>
