import {
  AutoColumnFieldMetadata,
  AutoFieldSubType,
  Datasource,
  FieldType,
  NumberFieldMetadata,
  Table,
} from "@budibase/types"

import TestConfiguration from "../../../../../tests/utilities/TestConfiguration"
import { search } from "../../../../../sdk/app/rows/search"
import { generator } from "@budibase/backend-core/tests"
import {
  withEnv as withCoreEnv,
  setEnv as setCoreEnv,
} from "@budibase/backend-core"
import {
  DatabaseName,
  getDatasource,
} from "../../../../../integrations/tests/utils"
import { tableForDatasource } from "../../../../../tests/utilities/structures"

// These test cases are only for things that cannot be tested through the API
// (e.g. limiting searches to returning specific fields). If it's possible to
// test through the API, it should be done there instead.
describe.each([
  ["lucene", undefined],
  ["sqs", undefined],
  [DatabaseName.POSTGRES, getDatasource(DatabaseName.POSTGRES)],
  [DatabaseName.MYSQL, getDatasource(DatabaseName.MYSQL)],
  [DatabaseName.SQL_SERVER, getDatasource(DatabaseName.SQL_SERVER)],
  [DatabaseName.MARIADB, getDatasource(DatabaseName.MARIADB)],
])("search sdk (%s)", (name, dsProvider) => {
  const isSqs = name === "sqs"
  const isLucene = name === "lucene"
  const isInternal = isLucene || isSqs
  const config = new TestConfiguration()

  let envCleanup: (() => void)[] = []
  let datasource: Datasource | undefined
  let table: Table

  beforeAll(async () => {
    await withCoreEnv({ SQS_SEARCH_ENABLE: isSqs ? "true" : "false" }, () =>
      config.init()
    )

    envCleanup.push(setCoreEnv({ SQL_LOGGING_ENABLE: "true" }))
    if (isSqs) {
      envCleanup.push(
        setCoreEnv({
          SQS_SEARCH_ENABLE: "true",
          SQS_SEARCH_ENABLE_TENANTS: [config.getTenantId()],
        })
      )
    }

    if (dsProvider) {
      datasource = await config.createDatasource({
        datasource: await dsProvider,
      })
    }
  })

  beforeEach(async () => {
    jest.clearAllMocks()
    const idFieldSchema: NumberFieldMetadata | AutoColumnFieldMetadata =
      isInternal
        ? {
            name: "id",
            type: FieldType.AUTO,
            subtype: AutoFieldSubType.AUTO_ID,
            autocolumn: true,
          }
        : {
            name: "id",
            type: FieldType.NUMBER,
            autocolumn: true,
          }

    table = await config.api.table.save(
      tableForDatasource(datasource, {
        primary: ["id"],
        schema: {
          id: idFieldSchema,
          name: {
            name: "name",
            type: FieldType.STRING,
          },
          surname: {
            name: "surname",
            type: FieldType.STRING,
          },
          age: {
            name: "age",
            type: FieldType.NUMBER,
          },
          address: {
            name: "address",
            type: FieldType.STRING,
          },
        },
      })
    )

    for (let i = 0; i < 10; i++) {
      await config.api.row.save(table._id!, {
        name: generator.first(),
        surname: generator.last(),
        age: generator.age(),
        address: generator.address(),
      })
    }
  })

  afterAll(async () => {
    config.end()
    envCleanup.forEach(f => f())
  })

  it("querying by fields will always return data attribute columns", async () => {
    await config.doInContext(config.appId, async () => {
      const { rows } = await search({
        tableId: table._id!,
        query: {},
        fields: ["name", "age"],
      })

      expect(rows).toHaveLength(10)
      for (const row of rows) {
        const keys = Object.keys(row)
        expect(keys).toContain("name")
        expect(keys).toContain("age")
        expect(keys).not.toContain("surname")
        expect(keys).not.toContain("address")
      }
    })
  })

  !isInternal &&
    it("will decode _id in oneOf query", async () => {
      await config.doInContext(config.appId, async () => {
        const result = await search({
          tableId: table._id!,
          query: {
            oneOf: {
              _id: ["%5B1%5D", "%5B4%5D", "%5B8%5D"],
            },
          },
        })

        expect(result.rows).toHaveLength(3)
        expect(result.rows.map(row => row.id)).toEqual(
          expect.arrayContaining([1, 4, 8])
        )
      })
    })

  it("does not allow accessing hidden fields", async () => {
    await config.doInContext(config.appId, async () => {
      await config.api.table.save({
        ...table,
        schema: {
          ...table.schema,
          name: {
            ...table.schema.name,
            visible: true,
          },
          age: {
            ...table.schema.age,
            visible: false,
          },
        },
      })
      const result = await search({
        tableId: table._id!,
        query: {},
      })
      expect(result.rows).toHaveLength(10)
      for (const row of result.rows) {
        const keys = Object.keys(row)
        expect(keys).toContain("name")
        expect(keys).toContain("surname")
        expect(keys).toContain("address")
        expect(keys).not.toContain("age")
      }
    })
  })

  it("does not allow accessing hidden fields even if requested", async () => {
    await config.doInContext(config.appId, async () => {
      await config.api.table.save({
        ...table,
        schema: {
          ...table.schema,
          name: {
            ...table.schema.name,
            visible: true,
          },
          age: {
            ...table.schema.age,
            visible: false,
          },
        },
      })
      const result = await search({
        tableId: table._id!,
        query: {},
        fields: ["name", "age"],
      })
      expect(result.rows).toHaveLength(10)
      for (const row of result.rows) {
        const keys = Object.keys(row)
        expect(keys).toContain("name")
        expect(keys).not.toContain("age")
        expect(keys).not.toContain("surname")
        expect(keys).not.toContain("address")
      }
    })
  })

  !isLucene &&
    it.each([
      [["id", "name", "age"], 3],
      [["name", "age"], 10],
    ])(
      "cannot query by non search fields (fields: %s)",
      async (queryFields, expectedRows) => {
        await config.doInContext(config.appId, async () => {
          const { rows } = await search({
            tableId: table._id!,
            query: {
              $or: {
                conditions: [
                  {
                    $and: {
                      conditions: [
                        { range: { id: { low: 2, high: 4 } } },
                        { range: { id: { low: 3, high: 5 } } },
                      ],
                    },
                  },
                  { equal: { id: 7 } },
                ],
              },
            },
            fields: queryFields,
          })

          expect(rows).toHaveLength(expectedRows)
        })
      }
    )

  it("respects the query fields", async () => {
    await config.doInContext(config.appId, async () => {
      await config.api.table.save({
        ...table,
        schema: {
          ...table.schema,
          name: {
            ...table.schema.name,
            visible: true,
          },
          age: {
            ...table.schema.age,
            visible: false,
          },
        },
      })

      const logSpy = jest.spyOn(console, "log")
      logSpy.mockClear()
      await search({
        tableId: table._id!,
        query: {},
      })
      const expectedMessageRgx = new RegExp(
        `^\\[SQL\\] \\[.+\\] query="select "a"."_id" as "a._id", "a"."_rev" as "a._rev", "a"."type" as "a.type", "a"."createdAt" as "a.createdAt", "a"."updatedAt" as "a.updatedAt", "a"."tableId" as "a.tableId", "a"."data_id" as "a.data_id", "a"."data_name" as "a.data_name", "a"."data_surname" as "a.data_surname", "a"."data_age" as "a.data_age", "a"."data_address" as "a.data_address" from \\(select \\* from \`${table._id}\` as \`a\` where \`a\`.\`_id\` like \\? order by \`a\`.\`_id\` asc limit \\?\\) as \`a\` where \`a\`.\`_id\` like \\? order by \`a\`.\`_id\` asc limit \\?" values="ro_%, 5000, ro_%, 5000"`
      )
      expect(logSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringMatching(expectedMessageRgx)
      )
    })
  })
})
