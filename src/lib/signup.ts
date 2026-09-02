/*
  Where a subscriber actually goes.

  There is one list, in Kit, and one endpoint. Every signup form on the site
  posts to it. This lives here rather than in each page because the site had
  drifted into two destinations at once: /subscribe/ posted to Kit while the
  home band posted to Netlify Forms, which would have split the list in two
  and put half of it somewhere Denvil never looks.

  The throw is the point. Before this, a missing PUBLIC_KIT_FORM_ID silently
  fell back to posting at /subscribe/thanks/ -- a page that tells the visitor
  "You are in. Check your inbox and confirm your email." while their address
  went nowhere at all. A signup form that quietly discards addresses and
  thanks people for them is the worst failure this site can have, so the build
  now refuses to produce one.
*/
const id = import.meta.env.PUBLIC_KIT_FORM_ID;

if (!id) {
  throw new Error(
    'PUBLIC_KIT_FORM_ID is not set. Every signup form on the site posts to it, ' +
    'and without it they would post to the thank-you page and lose the address. ' +
    'Set it in Netlify (Site configuration > Environment variables) to the id of ' +
    'the Kit form "Site signup (denvillee.com)" and redeploy.'
  );
}

export const KIT_ACTION = `https://app.kit.com/forms/${id}/subscriptions`;
