import { z } from "zod"
import { ViewV2 } from "../../../documents"
import { ViewV2Enriched } from "../../../sdk/view"
import { EmptyFilterOption, FilterGroupLogicalOperator } from "../../../sdk"

export interface ViewResponse {
  data: ViewV2
}

export interface ViewResponseEnriched {
  data: ViewV2Enriched
}

// export interface CreateViewRequest extends Omit<ViewV2, "version" | "id"> {}

const viewSchema = z.record(
  z.string(),
  z.object({
    visible: z.boolean().optional(),
    readonly: z.boolean().optional(),
    order: z.number().optional(),
    width: z.number().optional(),
    icon: z.string().optional(),
    columns: z
      .record(
        z.string(),
        z.object({
          visible: z.boolean(),
          readonly: z.boolean().optional(),
          order: z.number().optional(),
          width: z.number().optional(),
          icon: z.string().optional(),
        })
      )
      .optional(),
  })
)

const view = z.object({
  name: z.string(),
  tableId: z.string(),
  primaryDisplay: z.string().optional(),
  query: z.any(),
  sort: z.any(),
  schema: viewSchema.optional(),
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
