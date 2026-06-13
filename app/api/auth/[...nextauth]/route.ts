import NextAuth, {AuthOptions} from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

const scopes = [
    "user-top-read",
    "user-read-recently-played",
    "playlist-modify-public",
    "playlist-modify-private",
    "user-read-private",
    "user-read-email"
].join(" ");

export const authOptions: AuthOptions = {
    providers: [
        SpotifyProvider({
            clientId: process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET!,
            authorization: `https://accounts.spotify.com/authorize?scope=${encodeURIComponent(scopes)}`,
            checks: ["none"]
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token;
            }
            return token;
        },
        async session({ session, token }: any) {
            session.accessToken = token.accessToken;
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    cookies: {
        callbackUrl: {
            name: `next-auth.callback-url`,
            options: {
                sameSite: 'lax',
                path: '/',
                secure: false
            }
        },
        csrfToken: {
            name: `next-auth.csrf-token`,
            options: {
                sameSite: 'lax',
                path: '/',
                secure: false
            }
        },
        state: {
            name: `next-auth.state`,
            options: {
                sameSite: 'lax',
                path: '/',
                secure: false,
            }
        }
    }
};

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST };