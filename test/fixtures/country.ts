
export class Country
{

	code: string = 'FR'
	name: string = 'France'

	constructor()
	{
		throw new Error('Metadata must not construct records')
	}

}
