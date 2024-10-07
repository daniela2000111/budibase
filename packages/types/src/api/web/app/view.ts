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
  z.strictObject({
    visible: z.boolean(),
    columns: z.optional(
      z.record(
        z.string(),
        z.strictObject({
          visible: z.boolean(),
          readonly: z.optional(z.boolean()),
          order: z.optional(z.number()),
          width: z.optional(z.number()),
          icon: z.optional(z.string()),
        })
      )
    ),
  })
)

const view = z.strictObject({
  name: z.string(),
  tableId: z.string(),
  primaryDisplay: z.optional(z.string()),
  query: z.any(),
  sort: z.any(),
  schema: z.optional(viewSchema),
  queryUI: z.optional(
    z.strictObject({
      logicalOperator: z.nativeEnum(FilterGroupLogicalOperator),
      onEmptyFilter: z.optional(z.nativeEnum(EmptyFilterOption)),
      groups: z.optional(z.any()),
      filters: z.optional(z.any()),
    })
  ),
})

export const validateCreateViewRequest = view

export type CreateViewRequest = z.infer<typeof view>

export interface UpdateViewRequest extends ViewV2 {}
