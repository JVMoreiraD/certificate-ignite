import { APIGatewayProxyHandler } from "aws-lambda";
import { document } from "../utils/DynamoDbClient";

interface IUserCertificate {
    id: string;
    name: string;
    created_at: string;
    grade: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
    const { id } = event.pathParameters;
    const response = await document.query({
        TableName: "users_certificates",
        KeyConditionExpression: "id = :id",
        ExpressionAttributeValues: { ":id": id }
    }).promise()
    const userCertificate = response.Items[0] as IUserCertificate;

    if (userCertificate) {
        return {
            statusCode: 201,
            body: JSON.stringify({
                name: userCertificate.name,
                url: `https://certificate-serverless-node-bucket.s3.amazonaws.com/${id}.pdf`
            })
        }
    }
    return {
        statusCode: 400,
        body: JSON.stringify({
            message: "Certificado invalido"
        })
    }
}