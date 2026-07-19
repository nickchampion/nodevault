import { execute, protectedProcedure, router } from '@platform/components.api'
import {
  createTopicRequestSchema,
  deleteTopicRequestSchema,
  listTopicsResponseSchema,
  okResponseSchema,
  topicDtoSchema,
} from '@platform/components.nodevault.contracts'
import { topicCreate } from './create.js'
import { topicDelete } from './delete.js'
import { topicsList } from './list.js'

export const topicsRouter = router({
  list: protectedProcedure
    .output(listTopicsResponseSchema)
    .query(execute(topicsList)),

  create: protectedProcedure
    .input(createTopicRequestSchema)
    .output(topicDtoSchema)
    .mutation(execute(topicCreate)),

  delete: protectedProcedure
    .input(deleteTopicRequestSchema)
    .output(okResponseSchema)
    .mutation(execute(topicDelete)),
})
