const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio')
const app = express()
const path = require('path')
const favicon = require('serve-favicon')
const PORT = process.env.PORT || 8000
let articles = [[],[]]
const links = []

app.use(favicon(path.join(__dirname, 'public', 'img', 'favicon.ico')))
app.use(express.static(path.join(__dirname, 'public' )))


app.get('/', (req, res) => {
   res.sendFile(__dirname + '/index.html')
})

//Endpoint Describing how to use
app.get('/actor/', (req, res) => {
    res.redirect('/')
})

// Function to change name searched into title case
function toTitleCase(str) {
    return str.replace(/(?:^|\s)\w/g, function(match) {
        return match.toUpperCase();
    });
}

// main endpoint get request
app.get('/actor/:name', (req, res) => {
    articles = [[],[]]
    // Using axios to fetch the html from imdb and then searching for each individual piece of info
    axios(`https://www.imdb.com/find?q=${req.params.name}`)
    .then((response) => {
        let series;
        let actorSearch = req.params.name;
        let actor = actorSearch.replace(/\+/g, " ")
        let search = toTitleCase(actor)
        const html = response.data
        const $ = cheerio.load(html)
        const anchor = $("a:contains('" + search + "')", html)
        const a = anchor.attr('href')
        let id = a.substring(6, 16)
        let url = `https://www.imdb.com/name/${id}`

        // Async function to modularize the proccess
        const startLoop = async () => {
            const sendArticles = (articles) => {
                res.json(articles)
                console.log('Success')
            }
            try {
                // Start a second axios request based on the url of the found actor
                const response = await axios(url)
                const html2 = await response.data
                const $ = cheerio.load(html2)
                const poster = $("#name-poster", html2)
                const profilePic = poster.attr('src')
                const name = search
                const mainPage = url
                articles[0].push({
                    name,
                    profilePic,
                    mainPage
                })

                // Once inside the actor's page, search for each iteration of movie or show info
                $('div[id*=actor], div[id*=actress], *[id*=writer], *[id*=producer], *[id*=director]', html2).each(function() {
                    const span = $(this).find('span.year_column')
                    const year = $(span).text().replace(/\n/g, "").trim()
                    const a = $(this).find('a')
                    const href = $(a[0]).attr('href')
                    const link = "https://www.imdb.com" + href
                    const title = $(a[0]).text()
                    const roleGrab = $(this).text()
                    // these are all needed to cut out the role in the text that was returned from the search
                    const ninthToLastNewLine = roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n')-1)-1)-1)-1)-1)-1)-1)-1)
                    const eighthToLastNewLine = roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n')-1)-1)-1)-1)-1)-1)-1)
                    const thirdToLastNewLine = roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n')-1)-1)
                    const secondToLastNewLine = roleGrab.lastIndexOf('\n', roleGrab.lastIndexOf('\n')-1)
                    const lastNewLine = roleGrab.lastIndexOf('\n')
                    let role = roleGrab.substring(secondToLastNewLine + 1, lastNewLine)
                    links.push(link)

                    // Narrator or Not Narrator
                    if(roleGrab.includes('Narrator')) {
                        role = 'Narrator'
                    } else if (role == '\n') {
                        role = ''
                    } 

                    // If the current return is from a Tv Series, use these paramaters
                    if(roleGrab.includes('TV Series') && !roleGrab.includes('Show all')) {
                        series = 'TV Series'
                        const tvRoleInitial = roleGrab.substring(thirdToLastNewLine + 1, secondToLastNewLine)
                        const tvRole = tvRoleInitial.substring(4, tvRoleInitial.length)
                        articles[1].push({
                            title,
                            year,
                            link,
                            series,
                            tvRole,
                        })
                        // If the current return is a from a Tv Series and it has the "Show all Episodes" label, do this to grab the proper role
                    } else if((roleGrab.includes('TV Series') && roleGrab.includes('Show all')) || (roleGrab.includes('executive producer') && roleGrab.includes('Show all'))) {
                        series = 'TV Series'
                        const tvRoleInitial = roleGrab.substring(ninthToLastNewLine + 1, eighthToLastNewLine)
                        const tvRole = tvRoleInitial.substring(4, tvRoleInitial.length)
                        articles[1].push({
                            title,
                            year,
                            link,
                            series,
                            tvRole,
                        })
                        // This is for movies only
                    }else if(year !== "" && roleGrab.includes('executive producer') || roleGrab.includes('producer')){
                        const specialRole = roleGrab.substring(thirdToLastNewLine + 1, secondToLastNewLine)
                        
                        articles[1].push({
                            title,
                            year,
                            link,
                            specialRole,
                        })
                    }  else if(year !== ""){
                        articles[1].push({
                            title,
                            year,
                            link,
                            role,
                        })
                    }
                })
                sendArticles(articles)
            }catch (err) {
                console.error(err)
            }
        }
        startLoop()
        
    }).catch((err)=> console.error(err))
})
app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`))