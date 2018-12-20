const WooCommerceAPI = require('woocommerce-api');
const normalize = require(`gatsby-source-wordpress/normalize`);
const { capitalize, singular } = require('./helpers');


exports.sourceNodes = async ({ boundActionCreators, createNodeId, store, cache }, configOptions) => {
    const { createNode, touchNode } = boundActionCreators;
    delete configOptions.plugins;
    const { api, https, woocommerce_api_keys, wordpress_auth, fields } = configOptions;

    // set up WooCommerce node api tool
    const WooCommerce = new WooCommerceAPI({
        url: `http${https ? 's' : ''}://${api}`,
        consumerKey: woocommerce_api_keys.consumer_key,
        consumerSecret: woocommerce_api_keys.consumer_secret,
        wpAPI: true,
        version: 'wc/v3'
    });

    // Fetch Node and turn our response to JSON
    const fetchNodes = async (fieldName) => {
        const res = await WooCommerce.getAsync(fieldName);
        return JSON.parse(res.toJSON().body);
    };

    // Loop over each field set in configOptions and process/create nodes
    async function fetchNodesAndCreate(array) {
        for (const field of array) {
            let entities = await fetchNodes(field);
            entities = entities.map(e => { e.__type = `WC${singular(capitalize(field))}`; return e; })
            // Pull out certian entities from within the woocommerce response object 
            
            // Attempt at converting images to same format as gatsby-source-wordpress
            // async function pullAndDownloadMediaItems(entities) {
            //     let flattenedEntities = []
            //     for (let i = 0; i < entities.length; i++) {
            //         const e = entities[i];
            //         if ('images' in e) {
            //             console.log(`Attempting to download media files:`)
            //             const downloadedMediaItems = await normalize.downloadMediaFiles({
            //                 entities: e.images.map(image => {
            //                     image.source_url = image.src
            //                     image.__type = 'wordpress__wp_media'
            //                     image.wordpress_id = image.id
            //                     image.media_details = {}
            //                     return image
            //                 }),
            //                 store,
            //                 cache,
            //                 createNode,
            //                 createNodeId,
            //                 touchNode,
            //                 _auth: wordpress_auth,
            //             })
            //             console.log(`Downloaded media files`, downloadedMediaItems)
            //             flattenedEntities = flattenedEntities.concat(downloadedMediaItems.map(e => {e.__type = 'WCMediaItem'; return e;}))
            //             e.images__NODE = downloadedMediaItems.map(e => e.id)
            //             delete e.images
            //         }
            //         flattenedEntities = flattenedEntities.concat(e);   
            //     }
            //     console.log('count:', flattenedEntities.length)
            //     return flattenedEntities
            // }
            // entities = await pullAndDownloadMediaItems(entities)

            // Normalize the results
            entities = normalize.normalizeEntities(entities)
            // Standardizes ids & cleans keys
            entities = normalize.standardizeKeys(entities)
            // Converts to use only GMT dates
            entities = normalize.standardizeDates(entities)
            // Creates Gatsby IDs for each entity
            entities = normalize.createGatsbyIds(createNodeId, entities)
            // Create enitity relationships
            entities = entities.map(e => {
                if (e.grouped_products) {
                    e.grouped_products___NODE = e.grouped_products.map(t => entities.find(tObj => t === tObj.wordpress_id).id)
                    delete e.grouped_products
                }
                if (e.related_products) {
                    e.related_products___NODE = e.related_products.map(t => entities.find(tObj => t === tObj.wordpress_id).id)
                    delete e.related_products
                }
                return e;
            })
            // creates nodes for each entry
            normalize.createNodesFromEntities({ entities, createNode })
        }
    }

    // Leh go...
    await fetchNodesAndCreate(fields);
    return;
};
