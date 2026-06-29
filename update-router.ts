import fs from 'fs';

let content = fs.readFileSync('components/ViewRouter.tsx', 'utf8');

if (!content.includes("AdminAnalyticsView")) {
    content = content.replace("import { AdminWithdrawalView } from '../pages/AdminWithdrawalView';", "import { AdminWithdrawalView } from '../pages/AdminWithdrawalView';\nimport { AdminAnalyticsView } from '../pages/AdminAnalyticsView';");
    content = content.replace("export type ViewState =", "export type ViewState = 'ADMIN_ANALYTICS' |");
    
    const caseStatement = `    case 'ADMIN_WITHDRAWALS':
      if (currentUser.role !== 'ADMIN') {
        setView('HOME');
        return null;
      }
      return <AdminWithdrawalView />;
    case 'ADMIN_ANALYTICS':
      if (currentUser.role !== 'ADMIN') {
        setView('HOME');
        return null;
      }
      return <AdminAnalyticsView />;`;

    content = content.replace(/case 'ADMIN_WITHDRAWALS':[\s\S]*?return <AdminWithdrawalView \/>;/, caseStatement);
    fs.writeFileSync('components/ViewRouter.tsx', content);
    console.log("Updated ViewRouter.tsx");
}
