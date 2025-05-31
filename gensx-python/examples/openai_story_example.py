"""
OpenAI Story Generation Example

This example demonstrates:
1. Using OpenAI API within GenSX components with wrap()
2. Chaining components to transform content
3. Checkpoint tracking for AI workflows
4. Error handling for external API calls

Requirements:
    pip install openai

Set your OpenAI API key:
    export OPENAI_API_KEY="your-api-key-here"
"""

import asyncio
import os
from typing import Dict, Any

from gensx import Component, Workflow, wrap
from openai import AsyncOpenAI


@Component("PoemGenerator")
async def generate_poem(props: Dict[str, Any]) -> str:
    """Generate a poem about a dog who loves trucks using OpenAI."""
    subject = props.get("subject", "a dog who loves trucks")
    style = props.get("style", "playful and rhyming")

    # OpenAI client will read OPENAI_API_KEY from environment
    client = AsyncOpenAI()

    # Wrap the OpenAI client for tracking
    wrapped_client = wrap(client)

    try:
        response = await wrapped_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a creative poet who writes engaging, family-friendly poems."
                },
                {
                    "role": "user",
                    "content": f"Write a {style} poem about {subject}. Make it 12-16 lines long, appropriate for children, and full of joy and imagination."
                }
            ],
            max_tokens=300,
            temperature=0.8,
            stream=False
        )

        print(response)
        poem = response.choices[0].message.content.strip()
        print(f"📝 Generated poem ({len(poem)} characters)")
        return poem

    except Exception as e:
        print(f"❌ Error generating poem: {e}")
        raise


@Component("StoryTransformer")
async def transform_to_story(props: Dict[str, Any]) -> str:
    """Transform a poem into a Dr. Seuss-style children's book."""
    poem = props.get("poem")
    if not poem:
        raise ValueError("Poem is required to transform into a story.")

    # OpenAI client will read OPENAI_API_KEY from environment
    client = AsyncOpenAI()

    # Wrap the OpenAI client for tracking
    wrapped_client = wrap(client)

    try:
        response = await wrapped_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": """You are a children's book author who writes in the whimsical style of Dr. Seuss.
                    You create engaging stories with:
                    - Simple, rhythmic language
                    - Playful rhymes and wordplay
                    - Repetitive, memorable phrases
                    - Imaginative scenarios
                    - Short sentences perfect for young readers
                    - A sense of fun and adventure"""
                },
                {
                    "role": "user",
                    "content": f"""Transform this poem into a short children's book story in the style of Dr. Seuss:

{poem}

Create a complete story with:
- A clear beginning, middle, and end
- Fun character names and dialogue
- Whimsical descriptions
- 6-8 short paragraphs
- Maintain the joy and spirit of the original poem"""
                }
            ],
            max_tokens=600,
            temperature=0.9,
            stream=False
        )

        print(response)
        story = response.choices[0].message.content.strip()
        print(f"📚 Generated story ({len(story)} characters)")
        return story

    except Exception as e:
        print(f"❌ Error generating story: {e}")
        raise


@Component("ContentFormatter")
async def format_output(props: Dict[str, Any]) -> Dict[str, str]:
    """Format the final output with both poem and story."""
    poem = props.get("poem", "")
    story = props.get("story", "")

    return {
        "poem": poem,
        "story": story,
        "summary": f"Generated a {len(poem.split())} word poem and transformed it into a {len(story.split())} word children's story."
    }


@Workflow("TruckDogStoryWorkflow")
async def create_truck_dog_story(props: Dict[str, Any]) -> Dict[str, str]:
    """Complete workflow to generate a poem and transform it into a children's book."""

    # Step 1: Generate the original poem
    print("🎨 Step 1: Generating poem about a dog who loves trucks...")
    poem = await generate_poem({
        "subject": "a dog named Buster who loves big trucks",
        "style": "playful and rhyming"
    })

    # Step 2: Transform poem into Dr. Seuss-style story
    print("✨ Step 2: Transforming poem into Dr. Seuss-style children's book...")
    story = await transform_to_story({
        "poem": poem
    })

    return {
        "poem": poem,
        "story": story
    }


async def main():
    """Run the OpenAI story generation example."""
    print("🚛 GenSX OpenAI Story Generation Example")
    print("=" * 50)

    try:
        # Run the workflow
        result = await create_truck_dog_story({})

        # Display results
        print("\n" + "=" * 50)
        print("📝 ORIGINAL POEM:")
        print("=" * 50)
        print(result["poem"])

        print("\n" + "=" * 50)
        print("📚 DR. SEUSS-STYLE CHILDREN'S BOOK:")
        print("=" * 50)
        print(result["story"])

        print("\n" + "=" * 50)

        print("\n✅ Story generation completed successfully! 🎉")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
