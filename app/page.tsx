"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home, PlayCircle, ListTodo, Users, Wallet, UserRound, ShieldCheck,
  RefreshCw, Gift, ArrowDownToLine, CalendarCheck, Dices, Ticket,
  Megaphone, LogOut, LoaderCircle, ChevronRight, CircleCheck,
  Clock3, Copy, Bell, Sparkles, History, BadgeCheck
} from "lucide-react";

type Tab = "home" | "ads" | "tasks" | "referral" | "spin" | "wallet" | "profile";
type Profile = { id:string; telegramId:string; firstName:string; lastName:string|null; username:string|null; status:string };
type Balance = { balance:string; totalEarned:string; totalWithdrawn:string };
type Tx = { id:string; amount:string; type:string; description:string|null; created_at:string };
type Referral = { code:string; registered:string; qualified:string; rewarded:string };
type TelegramApp = { initData:string; ready:()=>void; expand:()=>void };
declare global { interface Window { Telegram?:{WebApp:TelegramApp} } }

const tabs = [
  {id:"home",title:"Home",icon:Home},{id:"ads",title:"Ads",icon:PlayCircle},
  {id:"tasks",title:"Tasks",icon:ListTodo},{id:"referral",title:"Refer",icon:Users},
  {id:"spin",title:"Spin",icon:Dices},{id:"wallet",title:"Wallet",icon:Wallet},
  {id:"profile",title:"More",icon:UserRound}
] as const;
function points(v:string){try{return BigInt(v).toLocaleString("en-US")}catch{return "0"}}
async function api(url:string,options?:RequestInit){
 const r=await fetch(url,{...options,cache:"no-store",credentials:"same-origin"});
 const data=await r.json(); if(!r.ok||data.error) throw new Error(data.message||data.error||"Request failed"); return data;
}
async function telegramSdk(){
 if(window.Telegram?.WebApp)return window.Telegram.WebApp;
 await new Promise<void>(resolve=>{const s=document.createElement("script");s.src="https://telegram.org/js/telegram-web-app.js";s.onload=()=>resolve();s.onerror=()=>resolve();document.head.appendChild(s)});
 return window.Telegram?.WebApp;
}
export default function Page(){
 const router=useRouter();
 const [tab,setTab]=useState<Tab>("home");
 const [user,setUser]=useState<Profile|null>(null);
 const [wallet,setWallet]=useState<Balance|null>(null);
 const [txs,setTxs]=useState<Tx[]>([]);
 const [referral,setReferral]=useState<Referral|null>(null);
 const [loading,setLoading]=useState(true);
 const [notice,setNotice]=useState("");
 const loadAccount=useCallback(async()=>{
  const [p,w]=await Promise.all([api("/api/me"),api("/api/wallet")]);
  setUser(p.user);setWallet({balance:String(w.wallet.balance??"0"),totalEarned:String(w.wallet.totalEarned??w.wallet.total_earned??"0"),totalWithdrawn:String(w.wallet.totalWithdrawn??w.wallet.total_withdrawn??"0")});
 },[]);
 useEffect(()=>{let active=true;async function init(){try{await loadAccount()}catch{const wa=await telegramSdk();if(!wa?.initData){if(active)router.replace("/login");return}try{wa.ready();wa.expand();await api("/api/auth/telegram",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({initData:wa.initData})});if(active)await loadAccount()}catch(e){if(active)setNotice(e instanceof Error?e.message:"Telegram login failed")}}finally{if(active)setLoading(false)}}void init();return()=>{active=false}},[loadAccount,router]);
 async function refresh(){try{await loadAccount();setNotice("ব্যালেন্স আপডেট হয়েছে")}catch{setNotice("ব্যালেন্স আপডেট করা যায়নি")}}
 async function logout(){try{await api("/api/auth/logout",{method:"POST"});router.replace("/login")}catch{setNotice("Logout failed")}}
 function select(t:Tab){setTab(t);setNotice("");window.scrollTo(0,0)}
 useEffect(()=>{if(tab==="wallet"){api("/api/transactions").then(r=>setTxs(r.transactions??[])).catch(()=>setTxs([]))}},[tab]);
 useEffect(()=>{if(tab==="referral"){api("/api/referrals").then(r=>setReferral(r.referral)).catch(()=>setReferral(null))}},[tab]);
 if(loading)return <main className="center-screen"><div className="brand-logo">T</div><h1>Tia Earn</h1><LoaderCircle className="spinning"/><p>অ্যাকাউন্ট যাচাই হচ্ছে...</p></main>;
 if(!user||!wallet)return <main className="center-screen"><div className="brand-logo">T</div><h1>Tia Earn</h1><p>{notice||"Login required"}</p><button className="primary-button" onClick={()=>router.push("/login")}>Login with Telegram</button></main>;
 const balanceCard=(title="Total Balance")=><section className="balance-card"><div className="balance-top"><span>{title}</span><button className="refresh-button" onClick={()=>void refresh()} aria-label="Refresh"><RefreshCw size={18}/></button></div><div className="balance-number">৳ {points(wallet.balance)}</div><p>আপনার যাচাইকৃত অ্যাকাউন্ট ব্যালেন্স</p><button className="balance-action" onClick={()=>select("wallet")}><Wallet size={16}/> Wallet Details</button></section>;
 const statCards=<div className="stats-grid"><div className="stat-card"><Gift/><strong>৳ {points(wallet.totalEarned)}</strong><small>Total Earned</small></div><div className="stat-card"><ArrowDownToLine/><strong>৳ {points(wallet.totalWithdrawn)}</strong><small>Total Withdrawn</small></div></div>;
 const coming=(name:string,desc:string,Icon:any)=><div className="empty-card"><span className="empty-icon"><Icon size={34}/></span><h3>{name}</h3><p>{desc}</p><span className="coming-pill"><Clock3 size={13}/> Integration pending</span></div>;
 const referralLink=referral&&process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?startapp=ref_${referral.code}`:"";
 return <main className="app-shell">
  <header className="app-header"><div className="header-brand"><div className="brand-logo small">T</div><div><strong>TiaEarn</strong><small>mini app · Earn More, Grow Together</small></div></div><span className="secure-tag"><ShieldCheck size={14}/> Secure</span></header>
  <section className="main-content">
   {notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
   {tab==="home"&&<>
    <section className="welcome-section"><div className="welcome-user"><div className="profile-avatar mini">{user.firstName.charAt(0).toUpperCase()}</div><div><p>Welcome back,</p><h2>{user.firstName} {user.lastName||""}</h2></div><span className="profile-verified"><BadgeCheck size={13}/> Verified</span></div><span>আজকের TiaEarn ড্যাশবোর্ডে স্বাগতম</span></section>
    {balanceCard()}
    <div className="stats-grid"><div className="stat-card"><Gift/><strong>৳ {points(wallet.balance)}</strong><small>Available Balance</small></div><div className="stat-card"><Sparkles/><strong>৳ {points(wallet.totalEarned)}</strong><small>Total Earned</small></div></div>
    <h3 className="section-title">Explore & Earn</h3><div className="feature-grid">
     {[{title:"Ads",sub:"Earn Money",icon:PlayCircle,tab:"ads"},{title:"Tasks",sub:"Complete & Earn",icon:ListTodo,tab:"tasks"},{title:"Referral",sub:"Invite Friends",icon:Users,tab:"referral"},{title:"Daily Bonus",sub:"Coming Soon",icon:CalendarCheck,tab:"tasks"},{title:"Spin",sub:"Lucky Spin",icon:Dices,tab:"spin"},{title:"Wallet",sub:"Withdraw",icon:Wallet,tab:"wallet"}].map(x=><button key={x.title} className="feature-card" onClick={()=>select(x.tab as Tab)}><span className="feature-icon"><x.icon size={23}/></span><strong>{x.title}</strong><small>{x.sub}</small></button>)}
    </div>
    <div className="security-strip"><ShieldCheck/><div><strong>Secure Reward System</strong><small>শুধুমাত্র যাচাইকৃত রিওয়ার্ড আপনার ব্যালেন্সে যোগ হবে</small></div></div>
   </>}
   {tab==="ads"&&<><h2 className="page-heading">Watch Ads & Earn</h2><p className="page-description">বিজ্ঞাপন দেখে রিওয়ার্ড অর্জন করুন</p><div className="provider-banner"><div><strong>Adsgram</strong><small>Rewarded Ads</small></div><PlayCircle size={34}/></div>{coming("Ad Rewards","বিজ্ঞাপন প্রদানকারীর সিকিউর সার্ভার-সাইড ভেরিফিকেশন যুক্ত হলে বিজ্ঞাপন দেখা ও রিওয়ার্ড ক্লেইম চালু হবে।",PlayCircle)}<div className="rules-card"><p><CircleCheck/> প্রতিটি বিজ্ঞাপন সার্ভারে যাচাই হবে</p><p><CircleCheck/> ভুয়া বা অসম্পূর্ণ ভিউতে পয়েন্ট দেওয়া হবে না</p><p><CircleCheck/> Reward limit provider policy অনুযায়ী</p></div></>}
   {tab==="tasks"&&<><h2 className="page-heading">Complete Tasks</h2><p className="page-description">টাস্ক সম্পন্ন করে পয়েন্ট অর্জন করুন</p>{["Follow our Telegram channel","Subscribe to YouTube","Social media engagement","Complete a survey"].map((t,i)=><div className="list-card" key={t}><span className="list-icon"><ListTodo/></span><div className="list-info"><strong>{t}</strong><small>Reward verification pending</small></div><span className="coming-pill">Soon</span></div>)}{coming("Daily Tasks","টাস্ক ও রিওয়ার্ড অ্যাডমিন অনুমোদন এবং যাচাইয়ের পর চালু হবে।",CalendarCheck)}</>}
   {tab==="referral"&&<><h2 className="page-heading">Refer & Earn</h2><p className="page-description">বন্ধুদের আমন্ত্রণ জানান</p>{referral?<><div className="referral-card"><Users size={34}/><h3>Your referral link</h3><p>শুধু নতুন Telegram অ্যাকাউন্টের সাইন-আপ রেফারেল হিসেবে গণনা হবে।</p>{referralLink?<><div className="referral-link">{referralLink}</div><button className="primary-button full-width" onClick={()=>{void navigator.clipboard.writeText(referralLink).then(()=>setNotice("Referral link copied")).catch(()=>setNotice("Copy failed"))}}><Copy size={15}/> Copy invite link</button></>:<p>Invite link unavailable: configure NEXT_PUBLIC_TELEGRAM_BOT_USERNAME.</p>}</div><div className="stats-grid"><div className="stat-card"><Users/><strong>{points(referral.registered)}</strong><small>Registered</small></div><div className="stat-card"><BadgeCheck/><strong>{points(referral.qualified)}</strong><small>Qualified</small></div></div><div className="empty-card compact"><p>Rewarded referrals: {points(referral.rewarded)}. কোনো বোনাস স্বয়ংক্রিয়ভাবে দেওয়া হচ্ছে না; যাচাই ও অ্যাডমিন অনুমোদন প্রয়োজন।</p></div></>:coming("Referral unavailable","রেফারেল ডেটাবেস মাইগ্রেশন চালু হওয়ার পর আপনার আমন্ত্রণ লিংক দেখা যাবে।",ShieldCheck)}</>}
   {tab==="spin"&&<><h2 className="page-heading">Spin & Win</h2><p className="page-description">লাকি স্পিন ও বোনাস</p><div className="spin-placeholder"><div className="spin-wheel"><Gift size={52}/></div><h3>Daily Spin</h3><p>স্পিন রিওয়ার্ড এখনো চালু হয়নি</p><button className="primary-button" disabled>Spin Now · Coming Soon</button></div>{coming("Lottery Draw","স্বচ্ছ ড্র এবং সার্ভার-সাইড অ্যান্টি-চিট যাচাই ছাড়া কোনো পুরস্কার দেখানো হবে না।",Ticket)}</>}
   {tab==="wallet"&&<><h2 className="page-heading">Wallet & Withdraw</h2><p className="page-description">আপনার ব্যালেন্স ও লেনদেন</p>{balanceCard("Current Balance")}{statCards}<div className="withdraw-card"><strong>Withdraw</strong><p>উত্তোলনের ন্যূনতম সীমা ও পেমেন্ট পদ্ধতি অ্যাডমিন সেটআপের পর দেখানো হবে।</p><button className="primary-button full-width" disabled>Withdraw · Coming Soon</button></div><h3 className="section-title history-title"><History size={18}/> Recent Transactions</h3>{txs.length?txs.map(t=><div className="list-card" key={t.id}><span className="list-icon"><ArrowDownToLine/></span><div className="list-info"><strong>{t.description||t.type}</strong><small>{new Date(t.created_at).toLocaleString()}</small></div><b className={Number(t.amount)>=0?"amount-plus":"amount-minus"}>{Number(t.amount)>0?"+":""}{points(t.amount)} ৳</b></div>):<div className="empty-card compact"><p>এখনো কোনো লেনদেন নেই</p></div>}</>}
   {tab==="profile"&&<><h2 className="page-heading">My Profile</h2><div className="profile-card"><div className="profile-avatar">{user.firstName.charAt(0).toUpperCase()}</div><h3>{user.firstName} {user.lastName||""}</h3><p>{user.username?"@"+user.username:"Telegram User"}</p><span className="profile-verified"><BadgeCheck size={14}/> Verified Account</span></div><div className="details-card"><div><span>Telegram ID</span><strong>{user.telegramId}</strong></div><div><span>Account Status</span><strong>{user.status}</strong></div></div><div className="menu-card"><div><ShieldCheck/><span>Security Settings</span><ChevronRight/></div><div><Users/><span>Referral Stats</span><ChevronRight/></div><div><History/><span>Payment History</span><ChevronRight/></div><div><Megaphone/><span>Official Channel</span><ChevronRight/></div></div><button className="logout-button" onClick={()=>void logout()}><LogOut size={18}/> Logout</button></>}
  </section>
  <nav className="bottom-navigation">{tabs.map(item=>{const Icon=item.icon;return <button key={item.id} className={tab===item.id?"active":""} onClick={()=>select(item.id)}><Icon size={20}/><span>{item.title}</span></button>})}</nav>
 </main>;
}
