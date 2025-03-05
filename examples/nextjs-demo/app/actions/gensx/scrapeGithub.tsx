/** @jsxImportSource @gensx/core */

import * as gensx from "@gensx/core";

export interface GitHubProfile {
  login: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  avatar_url: string;
  html_url: string;
  company: string | null;
  location: string | null;
  blog: string | null;
  twitter_username: string | null;
}

interface ScrapeGitHubProfileProps {
  username: string;
}

export const ScrapeGitHubProfile = gensx.Component<
  ScrapeGitHubProfileProps,
  GitHubProfile
>("ScrapeGitHubProfile", async ({ username }) => {
  const response = await fetch(`https://api.github.com/users/${username}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      ...(process.env.GITHUB_TOKEN
        ? {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          }
        : {}),
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`GitHub user ${username} not found`);
    }
    throw new Error(`Failed to fetch GitHub profile: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    login: data.login,
    name: data.name,
    bio: data.bio,
    public_repos: data.public_repos,
    followers: data.followers,
    following: data.following,
    created_at: data.created_at,
    avatar_url: data.avatar_url,
    html_url: data.html_url,
    company: data.company,
    location: data.location,
    blog: data.blog,
    twitter_username: data.twitter_username,
  };
});
