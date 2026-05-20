# Recommended Model Changes

Date: 2026-05-19

## Design Targets

LifeForge should feel like a life-board game with meaningful financial literacy under the hood. The player should be excited to proceed to the next season, not stressed by a countdown. Outcomes should feel partly shaped by luck, but mostly traceable to choices.

The target player stories:

- Balanced players survive and feel stable.
- Wealth maximizers can become rich but must manage health and meaning.
- Joy-first players can live well but may retire with less security.
- Status chasers get exciting short-term rewards but face realistic debt pressure.
- Crisis spirals can fail, but only after warnings and recovery chances.

## Implemented In This Pass

### Player-Led Pacing

The active decision timer is no longer a countdown. It now behaves as a calm life-moment prompt:

- No expiring choice timer.
- No automatic default choice.
- No red countdown treatment.
- Pending decisions pause life progression until the player chooses.
- The empty decision state invites the player to proceed to the next season and see what life brings.

This supports a Game-of-Life style rhythm: read the moment, make the choice, then advance the board.

### Gentler Health Model

The health model was softened so ordinary players are not crushed before midgame.

Changed seasonal health dynamics:

- Base health decay reduced from severe survival-meter drain to a lighter seasonal drift.
- Cheap food still creates drag, but less harshly.
- Gym and whole-food habits still help, but are not giant magic buttons.
- Low health now creates staged warnings and modest medical costs instead of immediate repeated punishment.
- Health below 30 lowers income by 15%, not 25%.
- Low-health care bills are $750 warning events and do not fire every season.

Intent: health matters, but players get warning and recovery time.

### Lighter Debt Hammer

Debt still compounds and high-interest credit still matters, but the language and flow are less punitive.

Changed debt dynamics:

- Cash deficits still move to high-interest credit at 19.8% APR.
- The journal now frames this as credit line usage and points toward catch-up options.
- Debt stress still reduces happiness, but with lighter seasonal penalties.
- Debt can now trigger recovery events instead of only spiraling.

Intent: teach that debt can trap you, while showing realistic tools for recovery.

### Catch-Up Opportunities

Three new conditional recovery events can appear between scheduled milestones.

#### Recovery Plan Check-In

Triggered when health drops below 35 and has not already been offered.

Player options:

- Join a basic gym and sleep routine.
- Use a community clinic preventive checkup.
- Take a low-cost reset week.

Lesson: preventive care is cheaper than crisis care.

#### Credit Counselor Catch-Up Plan

Triggered when the player has high-interest debt above $10,000.

Player options:

- Enter a hardship repayment plan with lower APR and partial fee waiver.
- Sell lifestyle costs and refinance the balance.
- Keep the current plan and monitor it.

Lesson: real debt recovery includes hardship plans, refinancing, and selling expensive obligations.

#### Cash And Debt Strategy Check

Triggered when the player has meaningful cash while still carrying debt.

Player options:

- Pay a focused chunk of debt while keeping an emergency reserve.
- Keep cash and pay down slowly.
- Refinance first, then make smaller payments.

Lesson: paying high-interest debt can be a guaranteed return, but emergency reserves still matter.

## Recommended Next Changes

### 1. Add A Visible Luck System

Luck should be explicit and fair.

Add event labels:

- Milestone
- Luck Event
- Opportunity
- Crisis
- Catch-Up

Each luck event should show why preparation mattered:

- Emergency fund reduced damage.
- Insurance reduced medical cost.
- High health reduced illness severity.
- Strong joy/social habits reduced stress impact.

### 2. Add After-Choice Feedback

Every major choice should produce a short consequence panel:

- What changed immediately.
- What changed in monthly life.
- What real-life concept was taught.
- Whether luck was involved.

Example:

"You chose Trade School. Your debt stayed manageable, but your income ceiling starts lower than the university path. This is a safer cashflow route, not an automatic best route."

### 3. Add Debt Types

Right now debt is one bucket. Split it into types:

- Student loans: lower APR, slower pressure.
- Credit card debt: high APR, stress, repayment urgency.
- Auto loan: tied to vehicle and possible repossession.
- Mortgage: housing expense plus equity building.

This will make realism much stronger and prevent cartoonishly large debt totals.

### 4. Add Realistic Default And Bankruptcy States

Instead of infinite debt growth:

- Credit lines should have limits.
- Auto loans can trigger repossession.
- Credit card default can freeze new borrowing.
- Bankruptcy can reset some debt but damage future choices.
- Debt settlement can cost happiness and credit access but stop runaway compounding.

### 5. Add Endgame Identity Recap

The retirement modal should name the player type and show defining choices.

Examples:

- Balanced Builder
- Joyful Minimalist
- Overworked Earner
- Status-Financed Dreamer
- Resilient Comeback Story

The recap should include:

- Best financial move.
- Most expensive choice.
- Biggest lucky break.
- Biggest recovery moment.
- One real-world lesson.

## Balance Philosophy

The game should not ask: "Did you already know the right answer?"

It should ask: "Can you learn from the consequences, recover, and make a better next choice?"

That means the model should use:

- Warnings before collapse.
- Recovery paths after mistakes.
- Luck that can be prepared for.
- Satisfying tradeoffs instead of one correct path.
- Consequences that feel realistic rather than scolding.
