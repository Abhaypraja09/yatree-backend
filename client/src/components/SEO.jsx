import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, keywords, image }) => {
    const siteTitle = "LogKaro | Professional Taxi & Fleet Management";
    const defaultDescription = "Smart Fleet Management solution for modern taxi businesses. Track vehicles, manage drivers, and monitor daily reports with ease.";
    const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;

    return (
        <Helmet>
            {/* Standard metadata tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={description || defaultDescription} />
            <meta name="keywords" content={keywords || "fleet management, taxi crm, vehicle tracking, driver management, taxi fleet software"} />

            {/* Facebook tags */}
            <meta property="og:type" content="website" />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description || defaultDescription} />
            {image && <meta property="og:image" content={image} />}

            {/* Twitter tags */}
            <meta name="twitter:creator" content="LogKaro" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description || defaultDescription} />
            {image && <meta name="twitter:image" content={image} />}

            {/* Canonical Link */}
            <link rel="canonical" href={window.location.href} />
        </Helmet>
    );
};

export default SEO;
