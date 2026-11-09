import { Client, Account, Avatars, Databases } from "react-native-appwrite";

export const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('69de946b000da5d9205c')
    .setPlatform('dev.ashraf.shelfie');

export const account = new Account(client)
export const avatars = new Avatars(client)
export const databases = new Databases(client)