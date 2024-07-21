import { EventType } from '@/enums/event'
import { Status } from '@/enums/status'
import { decode } from '@/utils/decode'
import { Schema as S } from '@effect/schema'
import { endsWith } from '@effect/schema/Schema'
import dayjs from 'dayjs'
import type Stripe from 'stripe'

export namespace PaymentSchema {
  export class Data extends S.Class<Data>('Data')({
    discord_user_id: S.NullOr(S.String),
    subscription_id: S.String,
    status: S.Enums(Status),
    current_period: S.Struct({
      start: S.String,
      end: S.String
    })
  }) {
    /**
     * ステータスがアクティブで現在時刻よりも有効期限があとであるかどうか
     */
    get active(): boolean {
      return this.status === Status.ACTIVE && dayjs(this.current_period.end).isAfter(dayjs())
    }

    update(event: CustomerSubscriptionUpdatedEvent | CheckoutSessionCompletedEvent): PaymentSchema.Data {
      const discord_user_id: string | undefined = (() => {
        if (event.type === EventType.CHECKOUT_SESSION_COMPLETED) {
          return event.data.object.client_reference_id ?? undefined
        }
        return undefined
      })()
      const current_period = (() => {
        if (event.type === EventType.CUSTOMER_SUBSCRIPTION_UPDATED) {
          return {
            start: dayjs(event.data.object.current_period_start * 1000).toISOString(),
            end: dayjs(event.data.object.current_period_end * 1000).toISOString()
          }
        }
        return undefined
      })()
      const params = JSON.parse(
        JSON.stringify({
          discord_user_id: discord_user_id,
          status: event.data.object.status,
          current_period: current_period
        })
      )
      console.log(params)
      return new PaymentSchema.Data({
        ...this,
        ...params
      })
    }

    static New = (
      event: Stripe.CustomerSubscriptionCreatedEvent | Stripe.CustomerSubscriptionUpdatedEvent | Stripe.CustomerSubscriptionDeletedEvent
    ): PaymentSchema.Data => {
      // @ts-ignore
      return decode(PaymentSchema.Data, {
        discord_user_id: null,
        subscription_id: event.data.object.id,
        status: event.data.object.status,
        current_period: {
          start: dayjs(event.data.object.current_period_start * 1000).toISOString(),
          end: dayjs(event.data.object.current_period_end * 1000).toISOString()
        }
      })
    }
  }
}

type CustomerSubscriptionCreatedEvent = Stripe.CustomerSubscriptionCreatedEvent
type CustomerSubscriptionUpdatedEvent = Stripe.CustomerSubscriptionUpdatedEvent
type CheckoutSessionCompletedEvent = Stripe.CheckoutSessionCompletedEvent
