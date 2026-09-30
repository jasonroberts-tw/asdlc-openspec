/**
 * The one TypeSafe client every tool in this repository shares, behind a narrow interface a selftest
 * can stub.
 *
 * WHAT IT DOES. `createJudge` returns a `TypeSafeJudge` -- one method, `choose`, that asks one Choice
 * question over some state and returns the label, its confidence and every label's probability -- or
 * a reason it returned none. A later question kind (a Noul, a Score) is a second method here, not a
 * second client in another tool.
 *
 * THE FAILURE IT EXISTS TO PREVENT. Two opposite ones, and the wrong fix for either is the other.
 * A tool that treats a missing `TYPESAFE_API_KEY` as a failure is red on every fresh clone and at
 * every pre-push, and gets bypassed with `--no-verify`, which costs every other gate too. A tool that
 * treats a FAILED CALL as a skip goes quietly green over a service that is down or a key that was
 * revoked, and reports "no findings" for a run that judged nothing. So the two are kept apart here:
 * a missing or blank key is `{ skip }` with the reason, and once a key is present every error the SDK
 * throws (authentication, rate limit, timeout, connection) propagates unchanged for the caller to
 * report as a failure (`CLAUDE.md` § The gate ladder, last paragraph).
 *
 * WHY IT IS NOT IN A GATE. It reads a token and the network, so no caller runs at pre-push or in
 * `.github/workflows/verify.yml`; each caller's selftest runs there over a stubbed judge, and the
 * one case that goes through the real SDK points `TYPESAFE_BASE_URL` at a closed loopback port.
 *
 * WHAT IT NEVER DOES. It never lets an answer decide anything: it returns probabilities, and the
 * caller's code owns what they change (`CLAUDE.md` § A program proposes; only a person promotes).
 *
 * Reads: `TYPESAFE_API_KEY` (required), `TYPESAFE_BASE_URL` (optional, the API root). Needs the
 * `@typesafe-ai/sdk` package (a devDependency, so `npm ci`) and, for a real call, the network. The
 * SDK is imported when a judge is made and not before, so a selftest that stubs the judge loads
 * nothing from it.
 */
import type { EntryType } from '@typesafe-ai/sdk'

/** One Choice answer: the selected label, its confidence and every label's probability. */
export interface ChoiceAnswer {
  readonly choice: string
  readonly confidence: number
  readonly probabilities: Readonly<Record<string, number>>
}

/** One Choice question over some state: what is asked, and what each label means. */
export interface ChoiceQuestion {
  readonly state: EntryType
  readonly instructions: string
  /** Label to the description of what that label means. */
  readonly criteria: Readonly<Record<string, string>>
}

/** What a caller depends on, so a selftest can hand it a stub. */
export interface TypeSafeJudge {
  choose(question: ChoiceQuestion): Promise<ChoiceAnswer>
}

/** A judge, or the reason there is none. A skip is not a failure and a failed call is not a skip. */
export type JudgeResult = { readonly judge: TypeSafeJudge } | { readonly skip: string }

export interface JudgeOptions {
  /** The environment to read the key and API root from; the process's by default. */
  readonly env?: Readonly<Record<string, string | undefined>>
  /** The model every question is sent to, pinned by the caller so a run can be reproduced. */
  readonly model: string
}

/**
 * A judge over the real SDK, or `{ skip }` when no key is set.
 *
 * A key that is present and wrong is NOT a skip: the first `choose` rejects with the SDK's error.
 * Throws when the SDK cannot be loaded, because a package that is declared and absent is a broken
 * install and not a legitimately absent input.
 */
export async function createJudge(options: JudgeOptions): Promise<JudgeResult> {
  const env = options.env ?? process.env
  const apiKey = (env.TYPESAFE_API_KEY ?? '').trim()
  if (!apiKey) {
    return {
      skip:
        'TYPESAFE_API_KEY is not set, so no TypeSafe call was made. Set it and run again to judge;' +
        ' its absence is never a failure.',
    }
  }
  let sdk: typeof import('@typesafe-ai/sdk')
  try {
    sdk = await import('@typesafe-ai/sdk')
  } catch (error) {
    throw new Error(
      `@typesafe-ai/sdk could not be loaded (${(error as Error).message}). It is a devDependency:` +
        ' run `npm ci`.',
      { cause: error },
    )
  }
  const baseURL = (env.TYPESAFE_BASE_URL ?? '').trim()
  const client = new sdk.TypeSafeClient(baseURL ? { apiKey, baseURL } : { apiKey })
  return {
    judge: {
      async choose(question) {
        const { answers } = await client.systemOne({
          state: question.state,
          questions: { asked: sdk.choice(question.instructions, question.criteria) },
          model: options.model,
        })
        const answer = answers.asked
        return {
          choice: answer.choice,
          confidence: answer.confidence,
          probabilities: answer.probabilities,
        }
      },
    },
  }
}
