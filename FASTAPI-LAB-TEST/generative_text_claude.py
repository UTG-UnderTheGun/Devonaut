# Use the Converse API to send a text message to Titan Text G1 - Express.

import boto3
from botocore.exceptions import ClientError

def converse_with_titan(prompt,yearold):
    # Create a Bedrock Runtime client in the AWS Region you want to use.
    client = boto3.client("bedrock-runtime", region_name="ap-southeast-2")

    # Set the model ID, e.g., Titan Text Premier.
    model_id = "amazon.titan-text-express-v1"

    # Start a conversation with the user message.
    user_message = f"My quiestion is {prompt} explane me like I am {yearold}"
    conversation = [
        {
            "role": "user",
            "content": [{"text": user_message}],
        }
    ]

    try:
        # Send the message to the model, using a basic inference configuration.
        response = client.converse(
            modelId="amazon.titan-text-express-v1",
            messages=conversation,
            inferenceConfig={"maxTokens":100,"stopSequences":["User:"],"temperature":0,"topP":1},
            additionalModelRequestFields={}
        )

        # Extract and print the response text.
        response_text = response["output"]["message"]["content"][0]["text"]
        return response_text


    except (ClientError, Exception) as e:
        print(f"ERROR: Can't invoke '{model_id}'. Reason: {e}")
        exit(1)

