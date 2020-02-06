const { ApolloServer, gql } = require('apollo-server');
const GraphQLJSON = require('graphql-type-json');
// import { makeExecutableSchema } from 'graphql-tools';

import _ from 'lodash';

let blocks = [
    {
        "id": 0,
        "idx": 0, 
        "name": "root",
        "count": 6,
        "expanded": true,
        "type": "R",
        "path": [],
        children: [
            {
                "id": "1",
                "idx": 0,
                "name": "English",
                "expanded": true,
                "type": "D",
                "path": [0],
                "children": [
                    {
                        "id": "4",
                        "idx": 0,
                        "deck": 1,
                        "path": [0, 0],
                        "name": "Witcher 3",
                        "type": "D", 
                        "expanded": false,
                        "children": [
                            {
                                "id": "5",
                                "deck": 1,
                                "path": [0, 0, 0],  
                                "idx": 0,
                                "name": "The Last Wish",
                                "type": "D",   
                            } 
                        ]    
                    }, 
                    {
                        "idx": 1,
                        "type": "f",
                        "id": "_0",
                        "name": "a flashcard", 
                        "path": [0, 0]
                    }
                ]
            },
            {
                "id": "2",
                "idx": 1,
                "name": "Math",
                "type": "D",
                "path": [0],
            },
            {
                "id": "3",
                "idx": 2,
                "name": "Programming",
                "type": "D",
                "path": [0],
            }
        ]
    }
]

const newCard = {
    template_id: "from db",
    template_title: "Basic",
    entries: [
        {  
            id: 0,
            name: "Front",
            content: {
                blocks: [{
                    type: "paragraph",
                    data: { text: "" }
                }]
            },
            entry_type: "Q",
        },
        {
            id: 1,
            name: "Back",
            content: {
                blocks: [{
                    type: "paragraph",
                    data: { text: "" }
                }]
            },   
            entry_type: "A",
        }, 
        // {
        //     id: 2,
        //     name: "Custom",
        //     content: {
        //         blocks: [{
        //             type: "paragraph",
        //             data: { text: "" }
        //         }]
        //     },   
        //     entry_type: "C",
        // },
        
    ]
}

let cards = [{
    id: "_0",
    template_id: "from db",
    deck_title: "English",
    template_title: "Basic",
    entries: [
        {
            id: 0,
            name: "Front",
            content: {
                blocks: [{
                    type: "paragraph",
                    data: { text: "probably some editorJs stuff or html" }
                }]
            },
            entry_type: "Q",
        },
        {
            id: 1,
            name: "Back",
            content: {
                blocks: [{
                    type: "paragraph",
                    data: { text: "probably some editorJs stuff or html" }
                }]
            },   
            entry_type: "A",
        },
        
    ]
}]


const typeDefs = `
    scalar JSON

    type Block {
        id: String
        idx: Int
        name: String
        expanded: Boolean
        type: String
        deck: String
        path: [Int]
        children: [Block] 
    }

    type Card {
        id: ID,
        template_id: String,
        template_title: String,
        entries: [CardEntry]
    }

    type CardEntry {
        id: Int,
        name: String,
        content: JSON, 
        template_title: String,
        entry_type: String
    }

    type Query {
        cards: [Card],
        blocks: [JSON],
        cardEntry(id: ID): CardEntry
    }

    type Mutation {
        addCardEntry (
            name: String
            content: JSON
            entry_type: String
            card_id: ID
            id: ID
        ): [CardEntry],
        card(id: ID): Card,
        saveCard (
            id: ID
            template_title: String
            entries: [JSON]
        ): Card,
        addCard: Card,
        saveBlocks (
            newBlocks: [JSON]
        ): [JSON],
        renameBlock (
            path: [Int]
            newName: String
        ): Block,
        deleteBlock (path: [Int]): [JSON],
        duplicateBlock (path: [Int]): [JSON]
    }

`;

const findBlock = (path) => {
    let currentBlock = blocks[0]
    for (let i = 1; i < path.length; i++) {
        // console.log("current block", currentBlock);
        if (currentBlock.children) {
            currentBlock = currentBlock.children.filter(c => c.idx === path[i])[0]
        } else {
            console.error("Couldn't find a block");
            return {}
        }
    }
    return currentBlock;
}
const ID = () => {
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 36 (numbers + letters), and grab the first 9 characters
    // after the decimal.
    return '_' + Math.random().toString(36).substr(2, 9);
  };

const duplicateBlockRec = (parent, childIdx) => {
    let child = parent.children.filter(c => c.idx === childIdx)[0];
    if (!child) {
        console.error("Didn't find a child")
        return;
    }
    // TODO child's array's idx != childIdx ~ ambigious
    let idx = parent.children.indexOf(child);
    let duplicate = Object.assign({}, child);
    
    duplicate.name = `${duplicate.name} (duplicate)`
    duplicate.id = String(blocks[0].count); 
    duplicate.idx = child.idx + 1;
    // shift other objects' (not array's) indexes
    parent.children.map(c => {
        if (c.idx >= duplicate.idx) {
            c.idx++;
        }
    })
    delete duplicate.children
    blocks[0].count++;
    
    parent.children.splice(idx + 1, 0, duplicate); 
    // duplicate card
    if (duplicate.type === 'f') {
        let card = cards.filter(c => c.id === child.id)[0];
        let newCard = Object.assign({}, card);
        newCard.id = `_${ID()}`
        duplicate.id = newCard.id;
        idx = cards.indexOf(card);
        cards.splice(idx + 1, 0, newCard)
    }
    // TODO option to duplicate children
    // OMG
    // it has to be recursive now
}


// TODO: no error checking here
const resolvers = {  
    JSON: GraphQLJSON, 
    Query: {   
        cards: () => cards,
        blocks: () => blocks
    },
    Mutation: {
        addCardEntry: (parent, { id, name, content, entry_type, card_id}) => {
            const card = _.find(cards, {id: card_id})
            card.entries.push({    
                name,
                content,
                entry_type,
                id
            })
            return card.entries;
        },
        addCard: (parent, args) => {
            let card = Object.assign({}, newCard);
            card.id = `_${ID()}`; 
            cards = [...cards, card]  
            return card;
        },
        card: (parent, { id }) => {
                return _.find(cards, {id: id})
        },
        saveCard: (parent, {id, template_title, entries}) => {
            let card = _.find(cards, {id: id});
            let idx = cards.indexOf(card);
            card = {
                id, 
                template_title, 
                entries
            }
            cards[idx] = card;
            return card;
        },
        saveBlocks: (parent, {newBlocks}) => {
            // console.log("newBlocks", newBlocks);
            blocks = [...newBlocks];
            return newBlocks;
        },
        renameBlock: (parent, {path, newName}) => {
            console.log("renameBlock newName", newName);
            let block = findBlock(path);
            block.name = newName;
            console.log("renameBlock block", block);
        },
        deleteBlock: (_, {path}) => {           
            let parent = findBlock(path.slice(0, -1));
            if (!parent) {
                console.error("Didn't find a parent!")
                return;
            }
            let child;
            
            // delete child
            parent.children = parent.children.filter(c => { 
                if (c.idx !== path[path.length - 1]) return true;
                // get deleted child
                else {
                    child = c;
                    return false;
                } 
            });
            if (parent.children.length === 0) {
                delete parent.children; 
            }
            if (!child) {
                console.error("Didn't find a child")
                return;
            }
            // TODO: what about other types?
            if (child.type === 'f') { 
                cards = cards.filter(c => c.id !== child.id)
            }  
            return blocks;
        },
        duplicateBlock: (_, {path}) => {
            let parent = findBlock(path.slice(0, -1));
            if (!parent) {
                console.error("Didn't find a parent!")
                return;
            }
            duplicateBlockRec(parent, path[path.length - 1]);
            

            return blocks;
        }
    }
};

// export const jsSchema = makeExecutableSchema({ typeDefs, resolvers });
export const server = new ApolloServer({ cors: {
            origin: '*'}			// <- allow request from all domains
            // credentials: true}		// <- enable CORS response for requests with credentials (cookies, http authentication)
    , typeDefs, resolvers });