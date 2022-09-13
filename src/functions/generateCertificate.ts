import { APIGatewayProxyHandler } from "aws-lambda"
import { document } from "../utils/DynamoDbClient"

interface ICreateCertificate {
    id: string;
    name: string;
    grade: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
    const { id, name, grade } = JSON.parse(event.body) as ICreateCertificate;
    await document.put({
        TableName: "users_certificates",
        Item: {
            id,
            name,
            grade,
            created_at: new Date().getTime()
        }
    }).promise();

    const response = await document.query({
        TableName: "users_certificates",
        KeyConditionExpression: "id = :id",
        ExpressionAttributeValues: { ":id": id }
    }).promise()
    return {
        statusCode: 201,
        body: JSON.stringify(response.Items[0]),

    }
}

