# Relay — scenario notes

## Why the Nepal-inspired scenario works

The primary demo is fictionalized, but it is inspired by a real coordination problem visible in the Aug 26, 2026 Nepal Himalayan flood: communities were cut off by damaged roads/bridges; electricity and health access were disrupted; helicopters were required to reach some areas; and responders had to coordinate search, relief supplies, health services, and rapidly changing access constraints.

This is exactly the product thesis Relay demonstrates: **the scarce resource is not only supplies or volunteers, but matching the right help to the right need under changing constraints.**

### Ethical rules
- Never use real victims' names or personal data.
- Never reproduce active emergency requests.
- Never imply affiliation with Nepalese government, NDRRMA, UN, Red Cross, WHO, or any NGO.
- Keep all operational details synthetic.
- Put "Fictionalized scenario for demonstration" in the UI and README.
- Do not gamify casualties or use death counts as UI decoration.

## Scenario comparison

| Scenario | Demo clarity | Social impact | Safety complexity | Visual potential | Recommended |
|---|---:|---:|---:|---:|---:|
| Nepal-inspired Himalayan flood | 10 | 10 | 8 | 9 | Primary |
| Mediterranean wildfire | 9 | 9 | 9 | 10 | Alternate |
| SE Asia flood/landslide | 9 | 9 | 8 | 9 | Alternate |
| Urban heatwave mutual aid | 9 | 9 | 6 | 7 | Safer alternate |

## Judge narrative

1. "A flood has cut off several communities. Needs are coming in faster than any volunteer can read them."
2. "Every volunteer already has an AI agent. Relay gives that agent a safe, structured WebMCP surface into the live coordination board."
3. "The agent finds what fits this volunteer's car, time window, distance, and safety boundaries."
4. "It can prepare commitments, but sensitive actions are escalated and final commitment stays human."
5. "Third-party content is untrusted; even an embedded prompt-injection attempt cannot bypass the server's rules or the review gate."
6. "The agent coordinates. The human commits."
