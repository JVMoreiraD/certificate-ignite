import { APIGatewayProxyHandler } from "aws-lambda"
import chromium from "chrome-aws-lambda"
import dayjs from "dayjs"
import { S3 } from "aws-sdk"
import { document } from "../utils/DynamoDbClient"
import { join } from "path";
import { readFileSync } from "fs"
import { compile } from "handlebars";
interface ICreateCertificate {
    id: string;
    name: string;
    grade: string;
}

interface ITemplate {
    id: string;
    name: string;
    grade: string;
    medal: string;
    date: string;
}
const compileTemplate = async (data: ITemplate) => {
    const filePath = join(process.cwd(), "src", "templates", "certificate.hbs");
    const html = readFileSync(filePath, "utf-8");
    return compile(html)(data)
}
export const handler: APIGatewayProxyHandler = async (event) => {
    const { id, name, grade } = JSON.parse(event.body) as ICreateCertificate;
    const response = await document.query({
        TableName: "users_certificates",
        KeyConditionExpression: "id = :id",
        ExpressionAttributeValues: { ":id": id }
    }).promise()
    const userAlreadyExists = response.Items[0];

    if (!userAlreadyExists) {
        await document.put({
            TableName: "users_certificates",
            Item: {
                id,
                name,
                grade,
                created_at: new Date().getTime()
            }
        }).promise();
    }


    const medalPath = join(process.cwd(), "src", "templates", "selo.png");
    const medal = readFileSync(medalPath, "base64")
    const data: ITemplate = {
        id,
        name,
        date: dayjs().format("DD/MM/YYYY"),
        grade,
        medal,
    }

    const content = await compileTemplate(data);
    const browser = await chromium.puppeteer.launch({
        headless: true,
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        userDataDir: '/dev/null'
    })
    const page = await browser.newPage();
    await page.setContent(content)
    const pdf = await page.pdf({
        format: "a4",
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true,
        path: process.env.IS_OFFLINE ? "./certificate.pdf" : null,
    })

    await browser.close();

    const s3 = new S3();

    await s3.putObject({
        Bucket: "certificate-serverless-node-bucket",
        Key: `${id}.pdf`,
        ACL: "public-read",
        Body: pdf,
        ContentType: "application/pdf"
    }).promise()

    return {
        statusCode: 201,
        body: JSON.stringify({
            message: "Certificado criado com sucesso",
            url: `https://certificate-serverless-node-bucket.s3.amazonaws.com/${id}.pdf`,
        }),

    }
}

