import{r as c,j as e}from"./vendor-BHMZ5347.js";import{d as m,l as x,a as y,M as b,T as j,b as v,L as u,u as w}from"./leaflet-D-Ik1PnX.js";import{d as k,u as S,c as I}from"./index-ol-osC4E.js";import{a6 as M,r as C}from"./icons-BDNxjeaS.js";const z=m(function(o,t){const r=new x.Popup(o,t.overlayContainer);return y(r,t)},function(o,t,{position:r},i){c.useEffect(function(){const{instance:s}=o;function d(p){p.popup===s&&(s.update(),i(!0))}function l(p){p.popup===s&&i(!1)}return t.map.on({popupopen:d,popupclose:l}),t.overlayContainer==null?(r!=null&&s.setLatLng(r),s.openOn(t.map)):t.overlayContainer.bindPopup(s),function(){t.map.off({popupopen:d,popupclose:l}),t.overlayContainer?.unbindPopup(),t.map.removeLayer(s)}},[o,t,i,r])});delete u.Icon.Default.prototype._getIconUrl;u.Icon.Default.mergeOptions({iconRetinaUrl:"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",iconUrl:"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",shadowUrl:"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"});const L=n=>{const o=n==="Moving",t=o?"#10b981":"#ef4444";return u.divIcon({className:"custom-car-icon",html:`
            <div style="
                background-color: ${t}; 
                width: 24px; 
                height: 24px; 
                border-radius: 50%; 
                border: 3px solid white;
                box-shadow: 0 0 10px ${t};
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            ">
                ${o?`<div style="
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    border: 2px solid ${t};
                    animation: pulse 1.5s infinite;
                "></div>`:""}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.19M15 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3.19"/>
                    <path d="M23 13v-2c0-2.6-2.4-4.5-5-5H6c-2.6.5-5 2.4-5 5v2"/>
                    <circle cx="7.5" cy="18.5" r="2.5"/>
                    <circle cx="16.5" cy="18.5" r="2.5"/>
                </svg>
            </div>
            <style>
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(2); opacity: 0; }
                }
            </style>
        `,iconSize:[24,24],iconAnchor:[12,12]})},P=({vehicles:n})=>{const o=w();return c.useEffect(()=>{if(n&&n.length>0){const t=u.latLngBounds(n.map(r=>[r.lat,r.lng]));o.fitBounds(t,{padding:[50,50]})}},[n,o]),null},W=()=>{const{selectedCompany:n}=k(),{theme:o}=S(),[t,r]=c.useState([]),[i,h]=c.useState(!0),[s,d]=c.useState(!1),l=async(a=!1)=>{if(n){a&&d(!0);try{const f=JSON.parse(localStorage.getItem("userInfo")),{data:g}=await I.get(`/api/admin/live-map/${n._id}`,{headers:{Authorization:`Bearer ${f.token}`}});g.success&&r(g.liveVehicles)}catch(f){console.error("Error fetching live map data:",f)}finally{h(!1),d(!1)}}};c.useEffect(()=>{l();const a=setInterval(()=>{l(!1)},3e4);return()=>clearInterval(a)},[n]);const p=[24.5854,73.7125];return e.jsxs("div",{style:{height:"100%",minHeight:"100vh",display:"flex",flexDirection:"column",background:"radial-gradient(circle at top right, #1e293b, #0f172a)"},children:[e.jsxs("div",{style:{padding:"20px 30px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(15, 23, 42, 0.6)",backdropFilter:"blur(10px)",zIndex:10},children:[e.jsxs("div",{children:[e.jsxs("h1",{style:{fontSize:"24px",fontWeight:"700",color:"white",display:"flex",alignItems:"center",gap:"10px"},children:[e.jsx(M,{size:24,color:"#0ea5e9"}),"Live GPS Tracking"]}),e.jsx("p",{style:{color:"rgba(255,255,255,0.5)",fontSize:"14px",margin:"4px 0 0 0"},children:"Real-time map view of all active vehicles (Ready for WheelsEye API)"})]}),e.jsxs("button",{onClick:()=>l(!0),disabled:s||i,style:{background:"rgba(14, 165, 233, 0.1)",color:"#0ea5e9",border:"1px solid rgba(14, 165, 233, 0.2)",padding:"10px 16px",borderRadius:"12px",display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",fontWeight:"600"},children:[e.jsx(C,{size:16,className:s?"spinning":""}),s?"Syncing...":"Refresh Map",e.jsx("style",{children:".spinning { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }"})]})]}),e.jsx("div",{style:{flex:1,position:"relative"},children:i?e.jsx("div",{style:{display:"flex",height:"100%",alignItems:"center",justifyContent:"center",color:"white"},children:"Loading Map Data..."}):e.jsxs(b,{center:t.length>0?[t[0].lat,t[0].lng]:p,zoom:12,style:{height:"100%",width:"100%",zIndex:1},children:[e.jsx(j,{url:"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'}),t.map(a=>e.jsx(v,{position:[a.lat,a.lng],icon:L(a.status),children:e.jsx(z,{className:"custom-popup",children:e.jsxs("div",{style:{padding:"5px",minWidth:"150px"},children:[e.jsx("h3",{style:{margin:"0 0 8px 0",fontSize:"16px",fontWeight:"800",color:"#0f172a"},children:a.carNumber}),e.jsxs("p",{style:{margin:"0 0 4px 0",fontSize:"13px",color:"#64748b"},children:[e.jsx("strong",{children:"Model:"})," ",a.model]}),e.jsxs("p",{style:{margin:"0 0 4px 0",fontSize:"13px",color:"#64748b"},children:[e.jsx("strong",{children:"Status:"}),e.jsx("span",{style:{color:a.status==="Moving"?"#10b981":"#ef4444",fontWeight:"700",marginLeft:"5px"},children:a.status})]}),e.jsxs("p",{style:{margin:"0",fontSize:"13px",color:"#64748b"},children:[e.jsx("strong",{children:"Speed:"})," ",a.status==="Moving"?`${a.speed} km/h`:"0 km/h"]})]})})},a.id)),e.jsx(P,{vehicles:t})]})}),e.jsx("style",{children:`
                .leaflet-popup-content-wrapper {
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                }
                .leaflet-popup-tip {
                    background: white;
                }
                .leaflet-container {
                    background: #0f172a;
                    font-family: 'Outfit', sans-serif;
                }
                /* Hide Leaflet Branding for cleaner look */
                .leaflet-control-attribution {
                    display: none !important;
                }
            `})]})};export{W as default};
