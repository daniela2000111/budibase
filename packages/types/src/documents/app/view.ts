import { LegacyFilter, SearchFilterGroup, SortOrder, SortType } from "../../api"
import { UIFieldMetadata } from "./table"
import { Document } from "../document"
import { DBView, SearchFilters } from "../../sdk"
import { z } from "zod"

export type ViewTemplateOpts = {
  field: string
  tableId: string
  groupBy: string
  filters: ViewFilter[]
  schema: any
  calculation: string
  groupByMulti?: boolean
}

export interface InMemoryView extends Document {
  view: DBView
  name: string
  tableId: string
  groupBy?: string
}

export interface View {
  name?: string
  tableId: string
  field?: string
  filters: ViewFilter[]
  schema: ViewSchema
  calculation?: ViewCalculation
  map?: string
  reduce?: any
  meta?: ViewTemplateOpts
  groupBy?: string
}

const basicViewFieldMetadata = z.object({
  visible: z.boolean(),
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
export type BasicViewFieldMetadata = z.infer<typeof basicViewFieldMetadata>

export interface RelationSchemaField extends UIFieldMetadata {
  visible: boolean
  readonly?: boolean
}

export enum CalculationType {
  SUM = "sum",
  AVG = "avg",
  COUNT = "count",
  MIN = "min",
  MAX = "max",
}

const numericCalculationFieldMetadata = basicViewFieldMetadata.extend({
  calculationType: z.enum([
    CalculationType.MIN,
    CalculationType.MAX,
    CalculationType.SUM,
    CalculationType.AVG,
  ]),
  field: z.string(),
})
export type NumericCalculationFieldMetadata = z.infer<
  typeof numericCalculationFieldMetadata
>

const countCalculationFieldMetadata = basicViewFieldMetadata.extend({
  calculationType: z.literal(CalculationType.COUNT),
})
export type CountCalculationFieldMetadata = z.infer<
  typeof countCalculationFieldMetadata
>

const countDistinctCalculationFieldMetadata =
  countCalculationFieldMetadata.extend({
    distinct: z.literal(true),
    field: z.string(),
  })
export type CountDistinctCalculationFieldMetadata = z.infer<
  typeof countDistinctCalculationFieldMetadata
>

const viewCalculationFieldMetadata = z.union([
  numericCalculationFieldMetadata,
  countCalculationFieldMetadata,
  countDistinctCalculationFieldMetadata,
])
export type ViewCalculationFieldMetadata = z.infer<
  typeof viewCalculationFieldMetadata
>

const viewFieldMetadata = z.union([
  basicViewFieldMetadata,
  viewCalculationFieldMetadata,
])
export type ViewFieldMetadata = z.infer<typeof viewFieldMetadata>

export interface ViewV2 {
  version: 2
  id: string
  name: string
  primaryDisplay?: string
  tableId: string
  query?: LegacyFilter[] | SearchFilters
  // duplicate to store UI information about filters
  queryUI?: SearchFilterGroup
  sort?: {
    field: string
    order?: SortOrder
    type?: SortType
  }
  schema?: ViewV2Schema
}

export const viewV2Schema = z.record(z.string(), viewFieldMetadata)
export type ViewV2Schema = z.infer<typeof viewV2Schema>

export type ViewSchema = ViewCountOrSumSchema | ViewStatisticsSchema

export interface ViewCountOrSumSchema {
  field: string
  value: string
}

/**
 e.g:
  "min": {
    "type": "number"
  },
  "max": {
    "type": "number"
  }
 */
export interface ViewStatisticsSchema {
  [key: string]: {
    type: string
  }
}

export interface ViewFilter {
  value?: any
  condition: string
  key: string
  conjunction?: string
}

export enum ViewCalculation {
  SUM = "sum",
  COUNT = "count",
  STATISTICS = "stats",
}
