// Config
// ------------
// Description: The configuration file for the ThreadwireAI website.

export interface Logo {
	src: string
	alt: string
}

export type Mode = 'auto' | 'light' | 'dark'

export interface Config {
	siteTitle: string
	siteDescription: string
	ogImage: string
	logo: Logo
	canonical: boolean
	noindex: boolean
	mode: Mode
	scrollAnimations: boolean
}

export const configData: Config = {
	siteTitle: 'ThreadwireAI - Visualize Data Seamlessly from Leads to Cash',
	siteDescription:
		'ThreadwireAI empowers organizations with end-to-end traceability and seamless data visualization for every part and product across the organization.',
	ogImage: '/og-threadwire.jpg',
	logo: {
		src: '/logo-threadwire.svg',
		alt: 'ThreadwireAI Logo'
	},
	canonical: true,
	noindex: false,
	mode: 'auto',
	scrollAnimations: true
}